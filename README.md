# Backend Fundamentals — Node.js, Express & MongoDB

A hands-on course where you build the backend for a fully-featured web application. You are given a complete, polished frontend — your job is to make it work.

The frontend is already written. It looks great. It does nothing.

Every `fetch()` call hits an endpoint that doesn't exist yet. Every issue you complete unlocks a new piece of the UI — the user list populates, the login form works, the dashboard shows real data, the chat goes live.

---

## Prerequisites

- Node.js 24+
- Docker & Docker Compose
- A code editor (VS Code recommended)
- Basic JavaScript knowledge

---

## Issues

Work through these in order. Each one unlocks a new part of the UI.

### kmom04 — Express, REST and Tools

- [getting-started](https://github.com/bth-node/backend-claude/issues/1) — Clone the repo and view the frontend
- [dev-environment](https://github.com/bth-node/backend-claude/issues/2) — ESLint, Prettier and editor setup
- [ci](https://github.com/bth-node/backend-claude/issues/3) — Continuous Integration with GitHub Actions
- [express](https://github.com/bth-node/backend-claude/issues/4) — Serve the frontend with Express
- [rest](https://github.com/bth-node/backend-claude/issues/5) — REST API with in-memory data
- [api-doc](https://github.com/bth-node/backend-claude/issues/6) — Self-describing API endpoint
- [logging](https://github.com/bth-node/backend-claude/issues/7) — Structured logging with Pino
- [testing](https://github.com/bth-node/backend-claude/issues/8) — Integration testing and code coverage

### kmom05 — Database and Authentication

- [mongodb](https://github.com/bth-node/backend-claude/issues/10) — Connect MongoDB and build the Users API
- [register](https://github.com/bth-node/backend-claude/issues/11) — Password hashing with bcrypt
- [login](https://github.com/bth-node/backend-claude/issues/12) — JWT authentication and cookies
- [middleware](https://github.com/bth-node/backend-claude/issues/13) — Auth middleware and protected routes

### kmom06 — Messages and Real-time

- [messages](https://github.com/bth-node/backend-claude/issues/17) — Personal messages with MongoDB
- [messages-edit](https://github.com/bth-node/backend-claude/issues/18) — Edit and delete messages
- [chat](https://github.com/bth-node/backend-claude/issues/19) — Real-time chat with Socket.io
- [sse](https://github.com/bth-node/backend-claude/issues/20) — Live message feed with Server-Sent Events

## Optional issues

These are not required. Do them if you're curious or have time to spare.

### kmom04

- [client](https://github.com/bth-node/backend-claude/issues/9) — Build a terminal client for your API

### kmom05

- [validation](https://github.com/bth-node/backend-claude/issues/15) — Input validation on auth routes
- [tui-auth](https://github.com/bth-node/backend-claude/issues/16) — Login and logout from the terminal client

### kmom06

- [tui-messages](https://github.com/bth-node/backend-claude/issues/22) — List and create messages from the terminal client
- [tui-stream](https://github.com/bth-node/backend-claude/issues/23) — Live message feed from the terminal client
- [tui-chat](https://github.com/bth-node/backend-claude/issues/24) — Real-time chat from the terminal client

---

## Documentation

`docs/` has an in-depth guide for almost every topic in the course — REST conventions, Mongoose, JWT and cookies, Socket.io, SSE — plus tool guides for Docker, Bruno, Pino and Vitest, and an FAQ for common problems. See [docs/README.md](docs/README.md) for the full index, organized by which issue each guide is relevant to. Skim the relevant guide before starting each issue — it explains why things work the way they do, not just what to type.

---

## Routes reference

| Method   | Path                   | Auth | Description                 |
| -------- | ---------------------- | ---- | --------------------------- |
| `GET`    | `/health`              | No   | Server and database status  |
| `GET`    | `/api/doc`             | No   | API reference               |
| `GET`    | `/api/users`           | No   | List all users              |
| `GET`    | `/api/users/:id`       | No   | Get one user                |
| `POST`   | `/auth/register`       | No   | Register new user           |
| `POST`   | `/auth/login`          | No   | Login                       |
| `POST`   | `/auth/logout`         | No   | Logout                      |
| `GET`    | `/api/me`              | ✓    | Logged-in user profile      |
| `GET`    | `/api/messages`        | ✓    | Messages for logged-in user |
| `POST`   | `/api/messages`        | ✓    | Create a message            |
| `PATCH`  | `/api/messages/:id`    | ✓    | Update a message            |
| `DELETE` | `/api/messages/:id`    | ✓    | Delete a message            |
| `GET`    | `/api/messages/stream` | ✓    | SSE stream of new messages  |

Auth is cookie-based — the server sets an httpOnly cookie on login. The frontend handles this automatically.

---

## Project structure

```
kmom04-06/
├── public/               # The frontend. Do not edit.
│   ├── index.html
│   ├── app.js
│   └── style.css
├── bruno/                # Bruno API collection (pre-made requests for all routes)
├── src/
│   ├── index.js          # Entry point
│   ├── server.js         # Express app setup
│   ├── client/           # Terminal client
│   ├── models/           # Mongoose models
│   ├── routes/           # Route handlers
│   └── scripts/
│       ├── seed.js       # Hash passwords for existing users
│       ├── chat.js       # Terminal Socket.io client
│       └── stream.js     # Terminal SSE client
├── middleware/           # Middleware for Express
├── docs/                 # Guides, reference and troubleshooting
├── report/               # Your kmom write-ups
├── .github/workflows/ci.yml
├── .env.example
├── docker-compose.yml
└── package.json
```

You might find more files in your repo, this is just an overview of the project structure and some important files.

---

## NPM scripts

```bash
npm start             # Start production server
npm run dev           # Start dev server (nodemon)
npm run serve         # Serve public/ without a backend (issue 01)
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run seed          # Hash passwords for existing users in the database
npm run chat          # Terminal Socket.io chat client
npm run stream        # Terminal SSE stream client
npm run client        # Terminal API client (issue 04e)
npm run lint          # Check code for errors
npm run lint:fix      # Check code for errors and auto-fix what it can
npm run format        # Auto-format code
npm run bruno:test    # Run Bruno API tests
npm run clean         # Remove node_modules/
npm run clean:all     # Remove node_modules/ and package-lock.json
```

---

## Tips

- Test your routes with [Bruno](https://www.usebruno.com/) — open the `bruno/` collection and select the `local` environment
- JWT secret goes in `.env` — never hardcode it
- If MongoDB won't connect, check `docker compose ps` to confirm the container is running
- Stuck? Check the browser console — the frontend logs every failed fetch with the expected URL

---

## Environment variables

Copy `.env.example` to `.env`. The defaults work for local development as-is — you'll fill in `MONGODB_URI` and `JWT_SECRET` gradually as you reach the issues that need them (mongodb, register):

```env
PORT=3000
HOST=localhost
MONGO_PORT=27017
MONGODB_URI=mongodb://localhost:27017/node
JWT_SECRET=change_this_to_something_long_and_secret
```
