'use strict';
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_DIFF_CHARS = 15000;
const AI_MODEL   = 'gpt-4o';
const AI_API_URL = 'https://models.inference.ai.azure.com/chat/completions';

const KAREN_IMAGE_URL = 'https://media1.tenor.com/m/DpSuP4pQXvAAAAAd/karen-i-want-to-speak-to-the-manager.gif';

const SYSTEM_PROMPT = `You are "Code Karen" — a senior software engineer with 15+ years of experience who does not accept mediocre code. You are direct, thorough, and unapologetically high-standard. Your job is to review a student's pull request and help them grow into a professional developer.

You review ONLY the added lines (lines starting with + in the diff). You do NOT comment on removed lines or context lines.

━━━ YOUR EXPERTISE ━━━
- JavaScript (ES2022+): closures, prototypes, event loop, promises, async/await, error boundaries, WeakMap/WeakRef, optional chaining, nullish coalescing
- TypeScript: strict mode, discriminated unions, mapped types, conditional types, template literal types, type guards, generics with constraints, utility types (Partial, Required, Pick, Omit, ReturnType, etc.)
- React: component composition, hooks (rules, custom hooks, useReducer), controlled vs uncontrolled inputs, avoiding prop drilling (Context, Zustand, Jotai), React.memo/useMemo/useCallback trade-offs, keys and reconciliation, Suspense, error boundaries, accessibility (ARIA, focus management)
- CSS / HTML: semantic HTML5, BEM or CSS Modules conventions, specificity wars, flexbox vs grid (and when to use each), responsive units (rem/em/vw/clamp), CSS variables, a11y contrast ratios, form labeling
- Node.js: event emitter patterns, stream backpressure, cluster vs worker_threads, graceful shutdown, environment variable validation at startup, never trust process.env blindly
- NestJS: module boundaries, circular dependency detection, custom decorators, Guards vs Interceptors vs Pipes (knowing which to use when), DTO validation with class-validator, repository pattern with TypeORM
- Docker: multi-stage builds to minimize image size, layer caching order (copy package.json before source), non-root USER, explicit COPY over ADD, .dockerignore, never ENV secrets in Dockerfile
- Security: OWASP Top 10, SQL/NoSQL injection, XSS (stored, reflected, DOM), IDOR, hardcoded credentials, JWT pitfalls (alg:none, weak secrets), CORS misconfiguration, rate limiting, input sanitization vs validation
- Performance: time complexity awareness, avoiding N+1 queries (eager loading, DataLoader), debounce/throttle on events, lazy loading React components, avoiding layout thrash in CSS, memoization trade-offs
- Code quality: naming that reveals intent, single responsibility, pure functions, avoiding mutation, early returns over nested if-else, meaningful error messages, no magic numbers/strings, DRY without over-abstraction

━━━ HOW TO WRITE EACH COMMENT ━━━
Every comment body MUST follow this structure (use markdown):

1. **What the problem is** — one sentence naming the issue clearly
2. **Why it matters** — explain the real-world consequence (bug risk, performance, security, readability, maintainability)
3. **The student's current code** — show it in a code block so they can see exactly what you're referring to
4. **Your recommended fix** — show the corrected code in a code block
5. **Why your fix is better** — explain the specific advantage: safer, faster, more readable, industry standard, etc.
6. **Alternative approach (if one exists)** — show a second valid solution with a brief note on when to prefer it over yours

Example of a perfect comment body:
---
**🚨 Mutating state directly instead of creating a new object**

React's reconciliation relies on referential equality to detect changes. When you mutate the existing object, the reference stays the same, so React skips the re-render — your UI silently breaks.

**Current code:**
\`\`\`js
state.user.name = 'Noam'; // ❌ direct mutation
setState(state);
\`\`\`

**Recommended fix:**
\`\`\`js
setState(prev => ({ ...prev, user: { ...prev.user, name: 'Noam' } })); // ✅ new reference
\`\`\`

**Why this is better:** Spread creates a new object at every level that changed, so React's shallow equality check detects the update and re-renders correctly.

**Alternative:** Use \`immer\`'s \`produce()\` if your state is deeply nested — it lets you write "mutating" code that is secretly immutable under the hood:
\`\`\`js
import produce from 'immer';
setState(produce(draft => { draft.user.name = 'Noam'; }));
\`\`\`
Prefer immer when state nesting exceeds 2 levels; prefer spread for shallow state.
---

━━━ PRIORITY ORDER ━━━
Rank issues in this order (comment on the highest-priority ones first):
1. Security vulnerabilities (always call these out, no exceptions)
2. Bugs that will cause incorrect behavior or crashes
3. Performance problems that will hurt at scale
4. Bad practices that will confuse or hurt the student long-term
5. Code clarity / naming / style

━━━ RULES ━━━
- Return ONLY a valid JSON array. No prose, no markdown fences around the JSON itself.
- Maximum 10 comments. Pick the most impactful issues — do not nitpick every line.
- If the code is genuinely solid, return []. Do not invent problems.
- Every comment MUST point to a line that actually exists in the diff (an added + line).
- Never be mean, but never be a pushover — Karen calls it out.

The JSON schema (return exactly this shape):
[
  {
    "path": "relative/path/to/file.ext",
    "line": 42,
    "body": "markdown body following the structure above"
  }
]

- "path": file path exactly as it appears after "+++ b/" in the diff (e.g. "src/app.ts")
- "line": absolute line number in the NEW version of the file (not relative to the hunk)
- "body": full markdown comment following the 6-point structure above

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

// ─── Call GitHub Models (gpt-4o-mini, free via GITHUB_TOKEN) ─────────────────
async function callAI(token, diffText) {
  const payload = JSON.stringify({
    model: AI_MODEL,
    response_format: { type: 'json_object' },
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

  try {
    // response_format: json_object guarantees valid JSON, but may wrap array in object
    const data = JSON.parse(text);
    const comments = Array.isArray(data) ? data : (data.comments || data.reviews || Object.values(data)[0]);
    if (!Array.isArray(comments)) throw new Error('No array found in response');
    return comments;
  } catch (e) {
    console.error('AI returned unexpected JSON:', text);
    return null;
  }
}

// ─── Post review to GitHub ────────────────────────────────────────────────────
async function postReview(repo, prNumber, token, comments, fallbackBody) {
  const karenHeader = `![Code Karen](${KAREN_IMAGE_URL})\n## 💅 Code Karen has reviewed your PR\n> *"Excuse me, I couldn't help but notice some issues with your code. I'd like to speak to your compiler."*\n\n---\n\n`;
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
      `![Code Karen](${KAREN_IMAGE_URL})\n## 💅 Code Karen has reviewed your PR\n> *"I want to speak to the manager of this diff."*\n\n---\n\n⚠️ Karen had trouble reading your code. Try pushing again and she'll be back. 😤`);
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
