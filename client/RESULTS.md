# Match results and history

Protected frontend routes:
- `/matches/:matchId/result`: real winner/defeat/draw, players, title, completion date and duration.
- `/history`: completed matches belonging to the signed-in user, newest recorded completion first; All/Wins/Losses/Draws filters and server-calculated statistics.

Authenticated API endpoints:
- `GET /api/matches/history` (registered before `/:matchId`).
- `GET /api/matches/:matchId/result`.

The backend authorizes membership using the cookie identity, not a requested user ID. Its explicit projections include only IDs, usernames, title, status, winner and timestamps. Deleted users/problems have truthful fallback labels while original player IDs remain available for outcome classification. Hidden tests and private account fields are neither loaded nor returned by these endpoints.

Victory/defeat compares the authenticated user ID to the persisted winner. A completed match without a winner is a draw. Result pages reload from MongoDB on refresh; active matches redirect to the arena. The arena redirects to results after an authoritative completion response or event. Play Again opens `/play` and does not emit matchmaking.

Socket reconnect uses the existing authenticated `watch_match` handshake and refetches the result. Failed result requests receive up to three attempts, with delays, before showing a recoverable connection-error screen. A socket disconnect never implies a cancelled match. The backend has no persisted interrupted state, so the UI never claims a result was erased or statistics were reverted. A confirmed result remains visible if a later refresh request fails.

Submission time, execution time and test totals are not persisted by the existing backend. They are omitted or marked Not available. Match duration uses actual start/finalization timestamps, bounded by the server deadline so delayed timeout finalization after server downtime does not add offline time. Completion date uses the finalization transaction's `updatedAt`; no model or judging changes were necessary.

## Files

Created:
- `src/pages/MatchResult.jsx`
- `src/pages/History.jsx`
- `src/components/MatchHeader.jsx`
- `src/utils/history.js`
- `test/history.test.js`
- `../server/src/controllers/history.controllers.js`
- `../server/test/history.test.js`
- `RESULTS.md`

Modified:
- `src/App.jsx`
- `src/pages/Duel.jsx` (completion navigation only; arena layout preserved)
- `src/pages/Dashboard.jsx` (history links and draw-inclusive total)
- `src/services/matches.js`
- `../server/src/routes/match.routes.js`
- `../server/test/integration.test.js`

No dependencies added. Judge0 execution, atomic winner updates, models, and matchmaking implementation remain unchanged in this feature.

## Checks

From the repository root:

```sh
npm test --prefix server
npm test --prefix client
npm run build --prefix client
```

Backend tests use real isolated MongoDB replica sets and HTTP/Socket.IO clients; Judge0 responses are stubbed in the regression suite. Coverage includes persisted victory/defeat/draw results, repeated result reads, private history, ignored client user IDs, aggregates including draws, empty history, deleted records, hidden-test exclusion, and retained results/statistics while a socket disconnects and rejoins.

Frontend tests cover outcome classification, all four history filters, result and Play Again destinations, authenticated API requests, and duration calculations including delayed timeout finalization. Existing arena and matchmaking tests remain included.

Browser checks during implementation confirmed real history data, the defeat page, refresh persistence, the draw filter, Dashboard → History, and Play Again → Pick Your Duel without queueing. A full new two-player visual walkthrough of victory and the recovery-error screen has not been completed. Production build retains the existing Monaco chunk-size warning.

MVP limitations: no history pagination, no persisted submission metrics, no persisted interrupted/cancelled state. Dashboard and history totals both include draws; the dashboard shows a dash until its real total loads. No Git metadata was present in the root/client/server folders, so review used the actual files rather than a Git diff.

Final verification after resume: all 11 backend tests and all 18 frontend tests passed; the production build passed. The only build warning is the existing Monaco bundle size. No live RapidAPI quota was consumed for this feature's tests.
