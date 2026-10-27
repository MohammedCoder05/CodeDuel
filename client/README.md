# CodeDuel frontend

React + Vite, Tailwind CSS (Vite plugin), React Router DOM, Axios, Socket.IO client, Lucide React, and Monaco Editor.
Use Node.js 22.12+ (validated with Node.js 26.7).

## Run

From `client/`:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The port is fixed because the existing backend CORS configuration permits this exact origin. Use `localhost`, not `127.0.0.1`.

In a second terminal, from `server/`, start the existing backend:

```sh
PORT=8000 npm run dev
```

The backend requires your existing `MONGODB_URI` and `JWT_SECRET` configuration. Its default port is 8080, so explicitly use 8000 to match the required Axios base URL. See `../server/README.md` for Judge0 configuration and database requirements.

```sh
npm run build
npm run preview
```

Run build/preview from `client/`. Stop the dev server before preview because both use port 5173.

## Manual checks with the real backend

1. Open `/dashboard` in a signed-out browser. While `/api/auth/me` loads, the session-check screen appears; a 401 redirects to `/login`.
2. Follow **Create account**. Submit different passwords and confirm the mismatch message appears without a registration request. Submit matching passwords with a new username/email; expect a redirect to `/login` with a success message. Registration sends only `username`, `email`, and `password`.
3. Try an incorrect password to see the backend error. Sign in with the new account. Expect `/dashboard`, your username, and the wins/losses returned by `/auth/me`. Total duels is their sum. Login is followed by `/me` because login does not return statistics.
4. Refresh `/dashboard`; the browser sends its HTTP-only cookie to `/auth/me` and the dashboard remains accessible. Visit `/login` and `/register` while signed in; both redirect to `/dashboard`.
5. Select **Log out**; expect a POST to `/auth/logout` and a redirect to `/login`. Revisit `/dashboard`; expect a redirect to `/login`. A failed logout displays an error and preserves frontend state so it can be retried.
6. Stop the backend and refresh. A connection-error screen with **Try again** appears instead of interpreting a network failure as a signed-out session. Restart the backend and retry.
7. Check narrow/mobile widths, keyboard navigation, submit loading states, and form labels. History remains disabled; recent duels contains no fabricated records.

The app never reads or stores tokens. All API calls share the Axios instance in `src/services/api.js`, with `withCredentials: true`. The backend JWT expires after one hour; persistence depends on the existing cookie and token remaining valid.

## Structure

- `src/services/api.js`: Axios and existing auth endpoints.
- `src/context/AuthContext.jsx`: startup session check, user state, login, logout.
- `src/App.jsx`: public/protected routes and session loading/error screen.
- `src/components/`: shared auth layout, labeled fields, submit/error controls.
- `src/pages/`: login, registration, dashboard shell.
- `src/index.css`: Tailwind import, design tokens, minimal global styles.

## Coding arena: two-user test

1. Run the existing backend on port 8000 and frontend on port 5173. The database needs an existing problem; the frontend does not seed problems.
2. Sign in as one user in a normal browser window and a **different user** in an incognito window or another browser profile. Two normal tabs share the same login cookie and cannot represent two different players.
3. Click **Find Match** on both dashboards to open `/play`, then **Start Matchmaking** on both duel-selection screens. The existing backend creates a match and emits `match_found` with a `matchId`. Both users should navigate to the same `/duel/:matchId` URL.
4. Verify the actual title, description, difficulty, starter code, sample inputs/expected outputs, and both player usernames against the match response. Match loading uses authenticated `GET /api/matches/:matchId`; no hidden-test endpoint or query is used.
5. Type JavaScript in Monaco, collapse/reopen the full-width problem section, and drag the handle below the editor. The focused handle also supports Up/Down arrows. The stacked structure remains at mobile widths. **Reset** restores the API starter code.
6. Note the timer, wait, then refresh. It must continue from the same server `endsAt`, not restart. When time expires it displays `00:00`, makes the editor read-only, and waits for the server result before declaring a draw. Code is in-memory only and refresh restores starter code.
7. Run Tests executes public samples. Submit Solution executes backend-owned hidden tests; the first accepted result wins. Both buttons are disabled while judging or after the deadline. The player bar identifies real users and labels activity unavailable; no typing or connection status is inferred for the opponent.
8. Open the URL while signed out to verify the login guard. Use a third authenticated account to check the backend's 403 response, an invalid ID for 400, and a nonexistent valid ID for 404. Network/server failures show a retry option. A 401 rechecks the session through the existing auth context.

**Reconnect behavior:** the arena rejoins through authenticated `watch_match`, listens for `match_completed`, and refreshes status over HTTP every three seconds as a missed-event fallback. The header's **Back** link only returns to the dashboard; it does not forfeit or cancel the match. Live typing activity remains unavailable. Judging and match outcomes come only from the backend.

Monaco and its JavaScript workers are bundled locally (no runtime CDN). The arena is lazy-loaded so its large editor bundles are not loaded on the login/dashboard route. Vite reports a size warning for these editor bundles.

Arena files: `src/pages/Duel.jsx`, `src/components/CodeEditor.jsx`, `src/components/SocketLayout.jsx`, `src/services/matches.js`, and `src/utils/duelClock.js`. `SocketLayout` owns the existing singleton's lifecycle across dashboard/arena navigation and disconnects when leaving authenticated routes. Dashboard stats refresh from the server when returning from a duel.

```sh
node --test test/*.test.js
npm run build
```

The tests cover absolute-deadline refresh behavior, expiry, missing deadlines, and authenticated/cancellable match requests. They do not replace a live two-player browser test.

## Pick Your Duel and queue

The protected `/play` route shows the selected 1v1 mode, rules, and Start Matchmaking. Cancel returns to the dashboard without emitting any matchmaking event. Start is unavailable until the existing authenticated socket connects.

During a search, `/play` shows the queue design with an elapsed timer measured from the button click. The displayed status comes from `match_searching`; no player count or wait-time estimate is invented. Leave Queue is deliberately disabled because cancellation has no backend event. In-app Back navigation returns to the active queue, and a browser unload prompts before leaving. A full reload or closing the browser disconnects the socket; queue restoration after reload is not implemented.

`SocketLayout` owns matchmaking listeners and state throughout authenticated navigation. The controller in `src/socket/matchmaking.js` guards repeated clicks synchronously, attaches listeners before emitting, and never emits from effects or reconnect handlers. Errors and disconnects stop the timer and permit an explicit retry after reconnection. `match_found` navigates once to the existing arena without disconnecting the singleton.

Additional verification:

- Refresh the dashboard and verify your authenticated identity/statistics remain.
- Open Find Match, cancel, then open again: no search should start until Start Matchmaking.
- Search with one account first: verify the elapsed timer increases and Leave Queue stays disabled. Browser Back must keep showing the queue.
- Start with a second account in a separate profile; verify both arrive at the same arena URL.
- Disconnect the backend during a search: expect a connection warning and stopped elapsed time. Reconnect alone must not restart searching; use Retry Matchmaking explicitly.
- Check at narrow widths. The three progress circles and all controls should remain visible.

The matchmaking tests cover duplicate emissions, Strict Mode listener setup/cleanup, same-match routing, malformed payloads, error retries, elapsed time, and disconnected behavior. The arena retains its stacked layout and absolute-deadline countdown.

### Verification on October 25, 2026

- All 11 Node tests passed; production build passed with the existing Monaco bundle-size warning.
- Fixed an interrupted-search timer bug: repeated failed reconnects now preserve the original stop time. A regression test covers it.
- Browser checks confirmed the authenticated dashboard, Find Match → `/play`, and Cancel → dashboard.
- The running backend recorded one search from each of two different authenticated users and created match `6add8eacba7df62af6ef51cc` with two sockets in its room.
- Browser automation then timed out, so final arena navigation/rendering, mobile appearance, and the live upward timer were not reverified in this run. The arena, editor, countdown utility, and match service were unchanged.
