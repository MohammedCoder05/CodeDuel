# CodeDuel

**One problem. One opponent. Ten minutes.**

CodeDuel is a real-time, 1v1 coding competition application built with the MERN stack. Two authenticated players are matched on the same problem, write JavaScript in a shared-time-limit arena, and compete to produce the first accepted solution.

[Live application](https://codeduel-kappa.vercel.app/) · [Demo video](https://drive.google.com/file/d/1hqQ5lju_sVueRbGz56-9Qx9SdzIAhzo0/view?usp=drive_link) · [GitHub repository](https://github.com/MohammedCoder05/CodeDuel)

## Features

- **Authentication:** registration, login, protected routes, and logout confirmation. JWTs are stored in HTTP-only cookies.
- **Real-time matchmaking:** authenticated Socket.IO connections pair two players and join them to a private match room.
- **Coding arena:** Monaco Editor, a collapsible problem statement, public samples, a vertically resizable editor, and a countdown derived from the server's deadline.
- **Code execution:** Run Tests checks public samples; Submit Solution checks hidden cases through hosted Judge0. API credentials stay on the backend.
- **Match outcomes:** the first accepted solution finalized before the deadline wins. Expired matches without a winner become draws.
- **Persistent results:** MongoDB transactions commit match results and win/loss statistics together, preventing duplicate winners and double-counted statistics.
- **Dashboard and history:** real statistics, the latest five completed duels, user-relative results, match durations, and win/loss/draw filters.
- **Responsive interface:** a full-width stacked arena, dark navy and warm cream surfaces, neon-lime accents, and Space Grotesk, Inter, and JetBrains Mono typography.

## How a duel works

1. Register or sign in, then choose **Find Match** on the dashboard.
2. Select **Start Matchmaking** on the Pick Your Duel screen.
3. When another player is available, both players enter the same match with a ten-minute server deadline.
4. Read the problem and implement its `solve(...)` function in JavaScript.
5. Use **Run Tests** for sample feedback, then **Submit Solution** for hidden-test judging.
6. Both players receive the recorded outcome, which is also available in Match History.

The winner is determined by server-side judging and an atomic database update—not by a client-reported result. Run Tests does not declare a winner.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Lucide React |
| Editor | Monaco Editor through `@monaco-editor/react` |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Real-time communication | Socket.IO |
| Authentication | JWT, HTTP-only cookies, bcrypt |
| Code execution | Hosted Judge0 through RapidAPI |
| Tests | Node.js test runner, isolated MongoDB replica sets via `mongodb-memory-server` |

## Architecture

```text
React frontend
  ├── Axios + HTTP-only cookie ──► Express API ──► MongoDB
  └── Authenticated Socket.IO ──► Matchmaking + private match rooms
                                      │
                               Server-side judging
                                      │
                               Hosted Judge0 API
                                      │
                         Atomic result + statistics update
                                      │
                         Match completion broadcast
```

User code runs in the hosted execution service, never directly inside Express. The backend supplies test cases, generates the function harness, enforces judging limits, and validates match membership and deadlines. Hidden test inputs, expected outputs, and hidden-test diagnostics are not returned to the frontend.

## Project structure

```text
CodeDuel/
├── client/
│   ├── public/                # Static assets, including favicon
│   ├── src/
│   │   ├── components/        # Shared UI, editor, socket layout
│   │   ├── context/           # Authentication state
│   │   ├── pages/             # Auth, dashboard, matchmaking, arena, results, history
│   │   ├── services/          # Authenticated Axios API calls
│   │   ├── socket/            # Socket singleton and matchmaking controller
│   │   └── utils/             # Countdown, outcomes, history, logout state
│   └── test/                  # Frontend logic and API-contract tests
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── data/              # Server-only problem bank
│   │   ├── services/          # Judge0, submissions, match lifecycle, seeding
│   │   └── realtime.js        # Socket authentication and matchmaking
│   ├── scripts/               # Problem seed and live Judge0 checks
│   ├── test/                  # Backend and integration tests
│   └── .env.example
└── README.md
```

## Run locally

### Prerequisites

- Node.js 22.12+ and npm.
- MongoDB Atlas or a local MongoDB **replica set**. A standalone MongoDB server does not support the transactions used for match finalization.
- A subscribed hosted Judge0 API and its RapidAPI credentials.

### 1. Clone and install

```sh
git clone https://github.com/MohammedCoder05/CodeDuel.git
cd CodeDuel
npm ci --prefix server
npm ci --prefix client
```

### 2. Configure the backend

For a fresh checkout, copy `server/.env.example` to `server/.env`. Keep an existing configured `.env` rather than overwriting it.

```dotenv
PORT=8000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-long-random-secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development

JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-rapidapi-key
JUDGE0_JAVASCRIPT_LANGUAGE_ID=63
```

Use the Judge0 URL, host, and JavaScript language ID supported by your provider. `PROBLEM_ADMIN_KEY` is optional and is required only for authenticated problem creation through the admin API; it is not needed for the seed script.

### 3. Configure the frontend

Create `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:8000
```

This is the backend **origin**, without `/api` or a trailing slash. Axios appends `/api`; Socket.IO uses the origin directly. If omitted, the frontend defaults to `http://localhost:8000`.

Never put JWT secrets, database credentials, or Judge0 keys in frontend environment variables. Vite exposes `VITE_` variables in the built application.

### 4. Seed the problem bank

```sh
cd server
node scripts/seed-problems.js
cd ..
```

The seed inserts missing problems only. It is repeatable and preserves existing problem documents, IDs, active matches, and match history.

### 5. Start both services

In separate terminals, from the repository root:

```sh
npm run dev --prefix server
```

```sh
npm run dev --prefix client
```

Open **http://localhost:5173**. With the configuration above, the backend health endpoint is **http://localhost:8000/api/health**.

To play a duel locally, use two different accounts in separate browser profiles or a normal window and an incognito window.

## Problem bank

All eight problems use the JavaScript `solve(...)` interface:

1. Sum of Two Numbers
2. Find Maximum in Array
3. Reverse a String
4. Valid Palindrome
5. Contains Duplicate
6. Two Sum
7. Valid Anagram
8. Binary Search

Test inputs use JSON argument arrays. For example, `[[2,7,11,15],9]` calls `solve([2,7,11,15], 9)`. A single array argument is nested: `[[1,2,3]]`. Legacy space-separated numeric inputs remain supported.

Solutions should **return** an answer instead of printing it. Array order matters; follow the problem's stated return format. Each new problem includes two public samples and six hidden cases. Existing database problems are left unchanged by seeding.

## Tests and production build

Run from the repository root:

```sh
npm test --prefix server
npm test --prefix client
npm run build --prefix client
```

Backend tests use isolated, disposable MongoDB replica sets and real HTTP/Socket.IO connections. They do not use the application database. The initial run may download a MongoDB binary. Judge0 responses are mocked in the automated integration suite.

Frontend tests cover countdown behavior, API contracts, user-relative outcomes, history, matchmaking lifecycle, recent duels, and logout confirmation. They do not replace browser layout or full two-player testing.

Optional live Judge0 checks, run from `server/`:

```sh
node scripts/check-judge0.js
node scripts/verify-problem-bank.js
```

These commands use the configured hosted API and **consume API quota**. The first checks accepted, wrong-answer, and runtime-error verdicts; the second checks the bank's reference solutions and intentionally incorrect candidates.

The frontend build is written to `client/dist`. Monaco's large editor/worker bundles may produce Vite's chunk-size warning.

## Deployment configuration

The live frontend is hosted on Vercel. For a deployment of this repository:

| Service | Configuration |
| --- | --- |
| Frontend | Root: `client`; build: `npm run build`; output: `dist` |
| Frontend environment | `VITE_API_URL` set to the public HTTPS backend origin, without `/api` or a trailing slash |
| Backend | Root: `server`; install: `npm ci`; start: `npm start` |
| Backend environment | `NODE_ENV=production`, `CLIENT_URL`, `MONGODB_URI`, `JWT_SECRET`, Judge0 settings, and the hosting platform's `PORT` |
| Database | MongoDB Atlas or a transaction-capable replica set |

Set `CLIENT_URL` to the exact frontend origin, without a trailing slash. Both Express and Socket.IO use it for credentialed CORS. Production authentication cookies use `HttpOnly`, `Secure`, and `SameSite=None`; browser restrictions on cross-site cookies can still affect deployments on unrelated domains.

Configure the frontend host to serve `index.html` for client-side routes such as `/play`, `/duel/:matchId`, and `/history`. Rebuild the frontend after changing `VITE_API_URL`. Backend environment values must be available when the service starts.

Run **one backend instance** for the current MVP: matchmaking and judging concurrency/rate limits are held in process memory. The backend host must support persistent Socket.IO connections.

Before a demo, verify login, a two-account match, sample execution, submission, both result pages, history, and refreshing a protected route on the deployed URLs.

## Current scope and limitations

- JavaScript and 1v1 duels only.
- Queue cancellation is not implemented; Leave Queue is disabled.
- Editor drafts are held in memory and reset on page refresh.
- Live opponent typing/activity is not tracked.
- Submission metrics and source-code history are not persisted.
- Hosted judging depends on provider availability and API quota.
- Matchmaking is not distributed across multiple backend instances.

## Author

Built by [MohammedCoder05](https://github.com/MohammedCoder05).
