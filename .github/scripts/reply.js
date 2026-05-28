'use strict';
const https = require('https');

const AI_MODEL   = 'gpt-4o';
const AI_API_URL = 'https://models.inference.ai.azure.com/chat/completions';

const SYSTEM_PROMPT = `You are "Code Karen" — a sharp senior engineer. A student is replying to one of your code review comments. Answer them directly. No essays.

- Clarification asked → short explanation + code example if it helps
- Why is your way better → one or two sentences, technical reason only
- They push back → defend with facts, or admit if they're right
- They say thanks → brief, stay in character

Keep it short. Use markdown and code blocks when useful.
Add a link (📖) only if there's a perfect doc page for what they're asking about.
Do NOT re-quote your original comment — they can see it.`;

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

// ─── Fetch a single PR review comment by ID ──────────────────────────────────
async function getComment(repo, commentId, token) {
  const url = `https://api.github.com/repos/${repo}/pulls/comments/${commentId}`;
  const res = await httpsRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-code-review-bot',
    },
  });
  if (res.status !== 200) throw new Error(`Failed to fetch comment ${commentId}: ${res.status}\n${res.body}`);
  return JSON.parse(res.body);
}

// ─── Post a reply into the same review thread ─────────────────────────────────
async function postReply(repo, prNumber, commentId, token, body) {
  const payload = JSON.stringify({ body });
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/comments/${commentId}/replies`;
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
  if (res.status !== 201) throw new Error(`Failed to post reply: ${res.status}\n${res.body}`);
  console.log('Reply posted successfully.');
}

// ─── Ask the AI model ─────────────────────────────────────────────────────────
async function callAI(token, diffHunk, filePath, karenComment, userQuestion) {
  const userMessage =
    `**File:** \`${filePath}\`\n\n` +
    `**Code in question:**\n\`\`\`\n${diffHunk}\n\`\`\`\n\n` +
    `**Your original review comment:**\n${karenComment}\n\n` +
    `**Student's question/reply:**\n${userQuestion}`;

  const payload = JSON.stringify({
    model: AI_MODEL,
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
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
  return text;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { GITHUB_TOKEN, COMMENT_ID, IN_REPLY_TO_ID, PR_NUMBER, REPO } = process.env;
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not available');
  if (!COMMENT_ID)   throw new Error('COMMENT_ID env var is missing');
  if (!PR_NUMBER)    throw new Error('PR_NUMBER env var is missing');
  if (!REPO)         throw new Error('REPO env var is missing');

  // Only process replies, not new top-level comments
  if (!IN_REPLY_TO_ID) {
    console.log('Not a reply to an existing comment — skipping.');
    return;
  }

  console.log(`Reply detected on comment #${IN_REPLY_TO_ID}. Checking if it targets Code Karen...`);

  // Fetch the comment being replied to
  const originalComment = await getComment(REPO, IN_REPLY_TO_ID, GITHUB_TOKEN);

  // Only respond if the original comment was from the GitHub Actions bot (Code Karen)
  if (originalComment.user.login !== 'github-actions[bot]') {
    console.log(`Original comment is from '${originalComment.user.login}', not Code Karen — skipping.`);
    return;
  }

  // Fetch the user's new comment to get its body
  const userComment = await getComment(REPO, COMMENT_ID, GITHUB_TOKEN);

  console.log(`Generating Karen's answer for: "${userComment.body.slice(0, 80)}..."`);

  const answer = await callAI(
    GITHUB_TOKEN,
    originalComment.diff_hunk,
    originalComment.path,
    originalComment.body,
    userComment.body,
  );

  // Add Karen's signature to the reply
  const signedAnswer = `💅 **Code Karen replies:**\n\n${answer}`;

  await postReply(REPO, PR_NUMBER, IN_REPLY_TO_ID, GITHUB_TOKEN, signedAnswer);
}

main().catch((err) => {
  console.error('Karen reply failed:', err.message);
  process.exit(1);
});
