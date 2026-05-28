'use strict';
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_DIFF_CHARS = 15000;
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a senior software engineer and expert code reviewer. Your job is to help a beginner student learn to code by reviewing their pull request changes.

Your expertise covers:
- JavaScript (ES2022+): async/await, closures, event loop, error handling, array/object methods
- TypeScript: strict types, generics, utility types, type narrowing, interfaces vs types
- React: hooks rules, component design, avoid unnecessary re-renders, memo/useMemo/useCallback, key props, accessibility
- CSS / HTML: semantic HTML5 elements, CSS specificity, flexbox/grid, responsive design, a11y (accessibility)
- Node.js: async patterns, streams, environment variable security, process management
- NestJS: decorators, dependency injection, modules, guards, interceptors, pipes, DTOs
- Docker: multi-stage builds, layer caching, non-root users, .dockerignore, never store secrets in images
- Security: XSS, SQL injection, hardcoded secrets, CORS misconfiguration, input validation
- Performance: unnecessary loops, N+1 queries, memory leaks, React re-render waste
- Code clarity: naming, single responsibility, DRY (but not over-abstracted), comments only on non-obvious WHY

You are reviewing ONLY the added lines (lines starting with + in the diff). Do NOT comment on removed lines or unchanged context lines.

Your tone must be:
- Encouraging and kind — this is a student learning, not a production engineer
- Educational — explain WHY something is wrong, not just what
- Concrete — always include a short corrected code example using markdown backticks when relevant
- Concise — one clear point per comment, not an essay

IMPORTANT RULES:
- Return ONLY a valid JSON array. No prose, no markdown code fences, no explanation before or after.
- Maximum 10 comments total — prioritize the most important issues; do not overwhelm a beginner.
- If the code looks good, return an empty array: []
- Each comment MUST correspond to an actual added line in the diff.

The JSON schema is exactly:
[
  {
    "path": "relative/path/to/file.ext",
    "line": 42,
    "body": "Your comment here with explanation and fix example."
  }
]

Where:
- "path" is the file path exactly as it appears after "+++ b/" in the diff (e.g. "src/app.ts", not "b/src/app.ts")
- "line" is the absolute line number of that line in the NEW version of the file (count from line 1 of the file)
- "body" is your educational comment in markdown

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

// ─── Call Gemini Flash ────────────────────────────────────────────────────────
async function callGemini(apiKey, diffText) {
  const prompt = `${SYSTEM_PROMPT}\n\n\`\`\`diff\n${diffText}\n\`\`\``;
  const payload = JSON.stringify({
    generationConfig: { responseMimeType: 'application/json' },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const res = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  if (res.status !== 200) throw new Error(`Gemini API error: ${res.status}\n${res.body}`);

  const parsed = JSON.parse(res.body);
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Unexpected Gemini response shape:\n${res.body}`);

  try {
    const comments = JSON.parse(text);
    if (!Array.isArray(comments)) throw new Error('Response is not an array');
    return comments;
  } catch (e) {
    console.error('Gemini returned non-JSON text:', text);
    return null;
  }
}

// ─── Post review to GitHub ────────────────────────────────────────────────────
async function postReview(repo, prNumber, token, comments, fallbackBody) {
  const body = fallbackBody || (
    comments.length > 0
      ? `## 🤖 AI Code Review\n\nFound **${comments.length}** suggestion(s). See inline comments on the diff.`
      : `## 🤖 AI Code Review\n\nLooks clean! No issues found in the changed lines. Keep it up! 🎉`
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
  const { GEMINI_API_KEY, GITHUB_TOKEN, PR_NUMBER, REPO } = process.env;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY secret is not set');
  if (!GITHUB_TOKEN)   throw new Error('GITHUB_TOKEN is not available');
  if (!PR_NUMBER)      throw new Error('PR_NUMBER env var is missing');
  if (!REPO)           throw new Error('REPO env var is missing');

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

  // 3. Call Gemini for the review
  const rawComments = await callGemini(GEMINI_API_KEY, truncated);

  if (rawComments === null) {
    // AI returned bad JSON — post a fallback general comment
    await postReview(REPO, PR_NUMBER, GITHUB_TOKEN, [],
      '## 🤖 AI Code Review\n\n⚠️ The AI reviewer returned an unexpected response. Please try pushing again to re-trigger the review.');
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
  console.log(`Gemini suggested ${rawComments.length} comment(s); ${filtered.length} on valid lines.`);

  // 5. Post the review
  await postReview(REPO, PR_NUMBER, GITHUB_TOKEN, filtered);
}

main().catch((err) => {
  console.error('Code review failed:', err.message);
  process.exit(1);
});
