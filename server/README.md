# CodeDuel MVP backend

Use Node.js 22.12+ and MongoDB **Atlas or a replica set**. Standalone MongoDB does not support the transactions used to commit the winner and both users' statistics together. Run one application server for this MVP; matchmaking, concurrency limits, and rate limits are in memory.

## Configuration and run

Keep your existing `server/.env`. Add the Judge0 values from `.env.example` (do not overwrite the MongoDB/JWT settings):

```dotenv
PORT=8000
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-subscribed-rapidapi-key
JUDGE0_JAVASCRIPT_LANGUAGE_ID=63
```

Verify the language ID against the JavaScript/Node.js language offered by your subscription. No credential belongs in `client/` or a `VITE_` variable. Subscribe to the API before testing. Restart the backend after changing `.env`.

From the repository root, in separate terminals:

```sh
cd server
npm install
PORT=8000 npm run dev
```

```sh
cd client
npm install
npm run dev
```

Open http://localhost:5173. The production frontend build is `npm run build` from `client/`.

## Problem contract

Starter code must define `solve(...)` and return a JSON-compatible result (async functions are supported). The server appends a stdin harness; it never executes source itself. Each test input is a JSON **argument array**: `[2,3]` calls `solve(2,3)`, `[[2,7,11,15],9]` calls `solve([2,7,11,15],9)`, `["hello"]` calls `solve("hello")`. Legacy space-separated numeric inputs such as `2 3` are also supported. A single array argument requires nesting: `[[1,2,3]]`.

Expected output is a string containing JSON, or plain text for string results. Object keys are order-independent; array order matters. Surrounding output whitespace is ignored. `solve` should return its answer rather than print debug logs to stdout. Suites contain 1–20 tests, each input up to 16,384 characters and output up to 8,192 characters. Source is limited to 64 KiB.

Problem creation now requires an authenticated account plus the server-only `X-Problem-Admin-Key` matching `PROBLEM_ADMIN_KEY`. It is disabled when that environment value is absent. Existing problems remain usable. Never add this key to frontend code. Review existing problem input formats and hidden cases before the demo.

## Judging and outcomes

- `POST /api/matches/:matchId/run` with `{ "code": "..." }` judges database sample tests and returns sample diagnostics.
- `POST /api/matches/:matchId/submit` judges database hidden tests. It returns only a verdict and, on a winning acceptance, the public match result. Hidden inputs, expected outputs, stdout, and diagnostics are never returned.
- Both endpoints require the cookie-authenticated match member and an active server deadline, checked before and after judging. Client verdicts/tests are ignored.
- Each Judge0 case requests 2 CPU seconds, 5 wall seconds, 256,000 KiB memory, 64,000 KiB stack, 64 processes/threads, 16 KiB files, and disabled networking. The remote request/polling is bounded; a complete suite has a 90-second deadline. Cases run with concurrency two. Provider failures do not count as a wrong answer or decide a winner.
- One judging request per player/match, four across the process, and ten per user/minute. The UI also blocks repeated clicks.
- The first accepted solution to **finish judging before the server deadline** wins. A MongoDB transaction conditionally completes the match and increments winner wins/loser losses exactly once. Ties at the deadline become draws; draws do not change wins/losses.
- A one-second deadline monitor completes expired matches, including those left by a prior server restart. It broadcasts `match_completed` only after commit. `watch_match` verifies socket membership before joining; HTTP refresh recovers missed events.
- Matchmaking returns a user to an existing active match and guards overlapping pairing requests. Queue cancellation remains unsupported.

## Verification

From `server/`:

```sh
npm test
node scripts/check-judge0.js
```

`npm test` starts isolated disposable MongoDB replica sets (the initial run downloads a MongoDB binary) and real HTTP/Socket.IO servers. It does not load `.env` or touch the application database. Hosted Judge0 responses are stubbed; submitted source is never executed by the tests. Tests cover authorization, private results, wrong/runtime verdicts, deadline checks, concurrent winner updates, stats, reconnect, both-player broadcasts, auth and matchmaking.

`node scripts/check-judge0.js` is a **live, quota-consuming** check using `.env`: correct solution, wrong answer, and runtime error. It does not alter the app database. Do not interpret passing mocked tests as proof that your hosted provider is configured.

From `client/`:

```sh
npm test
npm run build
```

For a browser demo, sign in as two different users in separate profiles. Find Match → Start Matchmaking on each. Verify identical arena URLs, sample results for a correct/incorrect/throwing solution, then submit a correct solution and check opposite outcomes and dashboard stats. Refresh the completed match to verify persistence. For a draw, let a separate match expire without an accepted submission. Use a third account to confirm that the private arena and submission endpoints reject access.

Current limits: no persisted source drafts/submission history, no queue cancellation, no distributed matchmaking, no live opponent typing, and no automatic retry of hosted judging after an application restart. Editor drafts reset on page refresh. The existing dashboard total counts wins plus losses, excluding draws.

## Verification completed on October 26, 2026

- 10 backend tests passed, including real isolated MongoDB transactions and authenticated HTTP/Socket.IO clients. Judge0 is stubbed in this repeatable suite.
- Live RapidAPI smoke checks passed for Accepted, Wrong Answer, and Runtime Error using the server-generated harness and configured resource limits.
- 13 frontend tests passed. Production build passed with the existing Monaco size warning.
- Dependency audit after updating the transitive body-parser dependency reported zero vulnerabilities.
- A new two-browser visual/UI walkthrough was not performed in this run; use the demo steps above to check the full rendered interaction.

## Files changed for this MVP

Created: `src/services/judge0.service.js`, `src/services/submission.service.js`, `src/services/matchLifecycle.service.js`, `src/realtime.js`, `test/judge0.test.js`, `test/submission.test.js`, `test/lifecycle.test.js`, `test/integration.test.js`, `scripts/check-judge0.js`, `.env.example`, this README, and `../client/src/utils/matchResult.js`.

Updated: `src/server.js` (wires extracted realtime setup), `src/controllers/match.controllers.js`, `src/routes/match.routes.js`, `src/routes/problem.routes.js`, `src/models/match.model.js`, `package.json`, `package-lock.json`; frontend `src/pages/Duel.jsx`, `src/pages/Dashboard.jsx`, `src/context/AuthContext.jsx`, `src/services/matches.js`, `test/arena.test.js`, `package.json`, and `README.md`.

Added dev dependency: `mongodb-memory-server` for isolated transaction tests. No new frontend or production dependency was needed. Socket authentication and matchmaking code was moved into `src/realtime.js` to test the same setup used by the application.
