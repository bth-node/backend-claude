# CLAUDE.md — backend-claude (kmom04)

Dev-environment notes and gotchas discovered while working through kmom04 on this machine.
Not part of the course material itself — just things that would otherwise need
rediscovering in a fresh session.

## Port 3000 is occupied on this machine

An unrelated Docker container (`mvc-haiku-api-1`, a different course project's "börsklient-api")
listens on `localhost:3000` on this dev machine, outside this repo's control. Do not kill it —
it's someone else's running work (see process-management rule: verify a PID's `/proc/<pid>/cwd`
before ever killing a stray process).

Workaround: run this project on **port 3050** instead, and keep `.env`'s `PORT=3050` in sync so
`npm run dev`, `npm start`, `npm run client`, etc. all agree without needing a manual override.

Reminder: Node's `--env-file=.env` (used by every npm script here) does **not** override
environment variables already set in the shell — a command-line `PORT=xxxx npm run dev` wins
over whatever `.env` says. That's expected Node behavior, not a bug in the script.

## kmom04 → kmom05 `_id` vs `id` mismatch

The pre-built frontend in `public/app.js` already reads Mongoose's `_id` field
(`onclick="App.loadUser('${u._id}')"`), anticipating kmom05's MongoDB-backed API. Issue #4
(REST API, kmom04) gives an exact in-memory array to copy that only has `id`:

```js
const users = [
  { id: '1', name: 'Alice Johansson', email: 'alice@example.com' },
  ...
]
```

Copied verbatim, `GET /api/users` and `GET /api/users/:id` both work correctly when tested
directly (curl, Bruno — which is issue #4's own suggested verification method), but clicking a
user card in the actual frontend UI silently breaks: `u._id` is `undefined`, so the app requests
`/api/users/undefined`.

This isn't a mistake in following issue #4 — its own test instructions (Bruno) never exercise
the frontend's `_id` read, so the mismatch only shows up if you click through the real UI.

Fix applied in `src/routes/users.js`: mirror `_id` alongside `id` on each user object, plus
`email`/`avatar` fields matching the seed data used elsewhere (`docker-compose`/seed script),
so the array satisfies both the REST issue's shape and the frontend's expectations ahead of
kmom05 replacing it with real Mongoose documents.
