'use strict';
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_DIFF_CHARS = 15000;
const AI_MODEL   = 'gpt-4o';
const AI_API_URL = 'https://models.inference.ai.azure.com/chat/completions';


const SYSTEM_PROMPT = `You are "Code Karen" — a sharp senior engineer reviewing a student's code. Be direct and helpful. No essays.

You review ONLY added lines (starting with + in the diff). Skip removed lines and context.

━━━ EXPERTISE ━━━
JS/TS, React, CSS/HTML, Node.js, NestJS, Docker, security, performance, clean code.

━━━ COMMENT FORMAT ━━━
Keep each comment short and scannable. Use this structure — nothing more:

**[emoji] Short title** (one line, names the issue)
One sentence explaining why it matters.
\`\`\`js
// ❌ what they wrote (only if needed for clarity)
// ✅ the fix
\`\`\`
> 💡 Alternative: one liner about another valid approach, only if one exists and is worth knowing.
> 📖 [Resource title](url) — only add a link if there's a great MDN/docs/guide page directly about this topic. Skip if there isn't one.

━━━ EMOJI GUIDE ━━━
🚨 security / bug that will break things
⚠️ bad practice / will cause problems later
💅 style / readability / naming
⚡ performance

━━━ EXAMPLE ━━━
**🚨 Direct state mutation**
React won't detect this change and the UI won't update.
\`\`\`js
// ❌ state.count = 5
// ✅ setState(prev => ({ ...prev, count: 5 }))
\`\`\`
> 📖 [Updating state — React docs](https://react.dev/learn/updating-objects-in-state)

━━━ RULES ━━━
- Max 8 comments. Only flag real issues — don't nitpick.
- Prioritize: security > bugs > bad practices > style.
- If the code is good, return [].
- Every comment must point to an actual added line in the diff.
- Return ONLY a valid JSON array. No extra text or markdown fences around the JSON.

JSON schema:
[{ "path": "src/app.ts", "line": 42, "body": "comment in markdown" }]

- "path": exactly as it appears after "+++ b/" in the diff
- "line": absolute line number in the new file

Now review the following PR diff:`;

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpsRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = { hostname: url.hostname, path: url.pathname + url.search, ...options };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Fetch PR diff from GitHub API ───────────────────────────────────────────
async function getGitHubDiff(repo, prNumber, token) {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
  const res = await httpsRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3.diff',
      'User-Agent': 'ai-code-review-bot',
    },
  });
  if (res.status !== 200) throw new Error(`GitHub diff fetch failed: ${res.status}\n${res.body}`);
  return res.body;
}

// ─── Parse unified diff → Set of "path:lineNumber" for added lines ───────────
function parseDiff(diffText) {
  const validLines = new Set();
  let currentFile = null;
  let newLineNum = 0;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      newLineNum = 0;
      continue;
    }
    if (line.startsWith('@@ ')) {
      const match = line.match(/\+(\d+)/);
      if (match) newLineNum = parseInt(match[1], 10) - 1;
      continue;
    }
    if (!currentFile) continue;
    if (line.startsWith(' ')) { newLineNum++; continue; }
    if (line.startsWith('+')) {
      newLineNum++;
      validLines.add(`${currentFile}:${newLineNum}`);
      continue;
    }
    // Lines starting with '-' are removed lines; don't increment newLineNum
  }
  return validLines;
}

// ─── Call GitHub Models ───────────────────────────────────────────────────────
async function callAI(token, diffText) {
  const payload = JSON.stringify({
    model: AI_MODEL,
    // No response_format enforced — the prompt instructs plain JSON array output.
    // json_object mode conflicts with array-only responses and causes parse failures.
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `\`\`\`diff\n${diffText}\n\`\`\`` },
    ],
  });

  const res = await httpsRequest(AI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  if (res.status !== 200) throw new Error(`GitHub Models API error: ${res.status}\n${res.body}`);

  const parsed = JSON.parse(res.body);
  const text = parsed.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Unexpected API response shape:\n${res.body}`);

  console.log('Raw AI response:', text.slice(0, 300));

  try {
    // Strip markdown fences if the model wrapped the JSON in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const data = JSON.parse(cleaned);
    // Accept bare array or wrapped object e.g. {"comments": [...]}
    const comments = Array.isArray(data) ? data : Object.values(data).find(Array.isArray);
    if (!Array.isArray(comments)) throw new Error('No array found in response');
    return comments;
  } catch (e) {
    console.error('Failed to parse AI response:', e.message);
    console.error('Full AI text:', text);
    return null;
  }
}

// ─── Post review to GitHub ────────────────────────────────────────────────────
async function postReview(repo, prNumber, token, comments, fallbackBody) {
  const karenHeader = `## 💅 Code Karen has reviewed your PR\n> *"Excuse me, I couldn't help but notice some issues with your code. I'd like to speak to your compiler."*\n\n---\n\n`;
  const body = fallbackBody || (
    comments.length > 0
      ? `${karenHeader}Found **${comments.length}** thing(s) that need to be fixed. See inline comments below — and don't make me call your manager. 😤`
      : `${karenHeader}Everything looks clean! No complaints from Karen today. Don't get used to it. 💅`
  );

  const ghComments = (comments || []).map((c) => ({
    path: c.path,
    line: c.line,
    side: 'RIGHT',
    body: c.body,
  }));

  const payload = JSON.stringify({
    body,
    event: 'COMMENT',
    comments: ghComments,
  });

  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews`;
  const res = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-code-review-bot',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  if (res.status !== 200) throw new Error(`GitHub review post failed: ${res.status}\n${res.body}`);
  console.log(`Review posted with ${ghComments.length} inline comment(s).`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { GITHUB_TOKEN, PR_NUMBER, REPO } = process.env;
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not available');
  if (!PR_NUMBER)    throw new Error('PR_NUMBER env var is missing');
  if (!REPO)         throw new Error('REPO env var is missing');

  console.log(`Reviewing PR #${PR_NUMBER} in ${REPO}...`);

  // 1. Get the PR diff
  const diff = await getGitHubDiff(REPO, PR_NUMBER, GITHUB_TOKEN);
  const truncated = diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + '\n\n[DIFF TRUNCATED — too large to review in full]'
    : diff;
  console.log(`Diff size: ${diff.length} chars${diff.length > MAX_DIFF_CHARS ? ' (truncated)' : ''}`);

  // 2. Parse the diff to know which lines are valid comment targets
  const validLines = parseDiff(diff);
  console.log(`Valid comment targets: ${validLines.size} added lines`);

  // 3. Call AI for the review
  const rawComments = await callAI(GITHUB_TOKEN, truncated);

  if (rawComments === null) {
    await postReview(REPO, PR_NUMBER, GITHUB_TOKEN, [],
      `## 💅 Code Karen has reviewed your PR\n> *"I want to speak to the manager of this diff."*\n\n---\n\n⚠️ Karen had trouble reading your code. Try pushing again and she'll be back. 😤`);
    return;
  }

  // 4. Filter to only comments on lines that actually changed
  const filtered = rawComments.filter((c) => {
    if (!c.path || typeof c.line !== 'number' || !c.body) return false;
    if (!validLines.has(`${c.path}:${c.line}`)) {
      console.warn(`Skipping comment on ${c.path}:${c.line} — not an added line`);
      return false;
    }
    return true;
  });
  console.log(`AI suggested ${rawComments.length} comment(s); ${filtered.length} on valid lines.`);

  // 5. Post the review
  await postReview(REPO, PR_NUMBER, GITHUB_TOKEN, filtered);
}

main().catch((err) => {
  console.error('Code review failed:', err.message);
  process.exit(1);
});
