# Problem bank and UI polish — October 26, 2026

## Problem bank

Added Find Maximum in Array, Reverse a String, Valid Palindrome, Contains Duplicate, Two Sum, Valid Anagram, and Binary Search. Each is Easy, JavaScript, and uses `solve(...)`, with two public samples and six hidden cases. Descriptions define empty-input behavior, string normalization and Two Sum's ascending index order.

MongoDB verification found exactly one of each of the eight titles. The original Sum of Two Numbers remains unchanged (two samples, three hidden cases); the seed's fallback definition has five hidden cases but is deliberately not applied over existing data. No existing problems, matches or history are replaced.

Inputs for new cases are JSON argument arrays: `[[2,7,11,15],9]` calls `solve([2,7,11,15], 9)`. Expected outputs are JSON encoded, including strings. The judge now handles JSON-encoded empty/whitespace strings exactly, while preserving legacy numeric space-separated inputs and plain expected outputs. Arrays remain structurally compared. Input type/size validation was tightened. Execution remains remote in Judge0 with existing limits; hidden cases stay backend-only.

Run from the repository root:

```sh
cd server
node scripts/seed-problems.js
```

The seed validates the bank before writing, inserts missing titles only, and uses stable IDs to make concurrent seed runs safe. It does not remove pre-existing duplicates or change database indexes.

## Changed files

Created:
- `server/src/data/problemBank.js`
- `server/src/services/problemSeed.service.js`
- `server/scripts/seed-problems.js`
- `server/scripts/verify-problem-bank.js`
- `server/test/fixtures/problemReferences.js`
- `server/test/problemBank.test.js`
- `POLISH.md`

Modified:
- `server/src/services/judge0.service.js` — string comparison and input validation only.
- `client/index.html`, `client/src/index.css` — Google Fonts, fallbacks, typography tokens, reduced-motion-aware transitions.
- `client/src/components/CodeEditor.jsx` — editor font only.
- `client/src/components/FormControls.jsx`, `MatchHeader.jsx` — focus/hover and navigation hit areas.
- `client/src/pages/Dashboard.jsx`, `Play.jsx`, `Duel.jsx`, `History.jsx`, `MatchResult.jsx`, `Login.jsx`, `Register.jsx` — typography, spacing and control/feedback polish.

Space Grotesk is used for headings, Inter for body and primary buttons, and JetBrains Mono for technical data, statistics and Monaco. The stacked arena, original palette, routes and gameplay remain intact. Queue pulse and judging spinner respect reduced motion. Sample results have clear pass/fail icons and grouped output. History badges, statistics, filters and primary actions have consistent spacing.

No dependencies installed. No credentials, auth, matchmaking protocol, winner/transaction logic or timeout behavior changed. There was no Git repository; source checkpoint: `/tmp/codeduel-before-final-polish`.

## Verification performed

- `npm test --prefix server`: **14 passed**, including isolated real MongoDB replica-set tests and real authenticated HTTP/Socket.IO integration. Covers atomic first-winner, exactly-once stats, deadline draws, reconnect, history/privacy/membership, samples/submissions, errors and rate/concurrency protections covered by the existing suite. Judge0 transport is mocked in integration tests.
- `npm test --prefix client`: **18 passed** (countdown, APIs, outcome/history mapping, matchmaking lifecycle/Strict Mode/reconnect).
- `npm run build --prefix client`: **passed**. Existing Monaco large-chunk warning remains.
- `cd server && node scripts/verify-problem-bank.js`: **passed against hosted Judge0**. Sixteen executions: one batch of all sample/hidden cases for each trusted reference, one batch of hidden cases for each intentionally incorrect candidate. Every reference matched; each incorrect candidate failed at least one hidden case. This uses API quota and does not benchmark each case's independent time limit.
- Repeated seed and concurrent seed tests passed; existing document values, IDs and an active-match reference were preserved.
- Actual configured MongoDB read-only count check: all eight titles exactly once; seven new banks each 2 samples/6 hidden.
- Browser: authenticated dashboard and existing real match history rendered; mobile history and defeat result checked at 375px; Pick Your Duel checked at 375, 768 and 1440px with no visible horizontal overflow. Existing historical result remained accessible after seeding. No console runtime errors observed in these checks.

## Remaining verification limits

The complete every-page/three-width browser matrix was not completed. In particular, active Monaco editing, queue animation and live judging feedback still need a two-user visual pass on mobile/tablet. A new full two-browser match was not played during this polish pass; automated gameplay integration and independent live hosted reference checks passed. Fonts need network access, with system fallbacks provided. Existing result pages still truthfully show unavailable submission metrics where the backend does not persist them.

Run app in separate terminals:

```sh
npm run dev --prefix server
npm run dev --prefix client
```

For final demo rehearsal: sign in as two different users in separate browser profiles, enter matchmaking, run sample tests, submit a correct solution, confirm both results/history, and repeat at 375px with Monaco and the countdown visible. Do not modify active-match problems to force a particular problem.
