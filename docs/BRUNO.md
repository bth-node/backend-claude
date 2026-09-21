# Bruno

API testing with Bruno — a local, offline-first API client.

**Relevant from**: issue 03 (express) | **See also**: [API-DESIGN.md](API-DESIGN.md)

---

## What is Bruno?

Bruno is an API client (similar to Postman) that saves requests as files in the repo. That means everyone on the team shares the same collection of requests — no one needs to import or sync anything manually.

Requests are saved in `.bru` files under `bruno/`.

---

## Installation

Two options — pick whichever suits you:

**VS Code extension** (already installed via `.vscode/extensions.json` in issue 02):

1. Click the Bruno icon in the sidebar
2. **Open Collection** → select the `bruno/` folder at the repo root
3. Select the **student** environment (port 3000) in the top right

**Standalone app**: install [Bruno Desktop](https://usebruno.com) and do the same three steps there.

---

## Collection structure

```
bruno/
├── bruno.json              # Collection config
├── collection.bru          # Collection metadata
├── environments/
│   └── student.bru         # baseUrl: http://localhost:3000
├── health/
│   └── get-health.bru      # GET /health
├── doc/
│   └── get-api-doc.bru     # GET /api/doc
├── users/
│   ├── get-users.bru       # GET /api/users
│   └── get-user-by-id.bru  # GET /api/users/:id
├── auth/
│   ├── register.bru        # POST /auth/register
│   ├── login.bru           # POST /auth/login
│   └── logout.bru          # POST /auth/logout
├── dashboard/
│   ├── get-me.bru          # GET /api/me
│   ├── patch-me-name.bru   # PATCH /api/me (name)
│   └── patch-me-avatar.bru # PATCH /api/me (avatar)
└── messages/
    ├── get-messages.bru     # GET /api/messages
    ├── post-message.bru     # POST /api/messages
    ├── patch-message.bru    # PATCH /api/messages/:id
    └── delete-message.bru   # DELETE /api/messages/:id
```

---

## Environments

Environments configure `{{baseUrl}}` — the server's address:

| Environment | baseUrl | Use |
|---|---|---|
| **student** | `http://localhost:3000` | Your server |

Select **student** in the dropdown in the top right.

---

## Workflow

### 1. Test without auth

These routes work without logging in:

```
GET /health          → { status: 'ok', ... }
GET /api/doc         → { endpoints: [...] }
GET /api/users       → [ { name, email, ... }, ... ]
```

### 2. Log in

Run **Login** in the auth folder. Bruno saves the cookie automatically — every subsequent request sends it.

### 3. Test protected routes

After logging in, these work:

```
GET /api/me          → { name, email, ... }
GET /api/messages    → [ { text, ... }, ... ]
POST /api/messages   → Create a message
```

### 4. Variables

Some requests use variables you have to set manually:

- `{{userId}}` — used by **Get User by ID** in `users/`. Paste in an `_id` from `GET /api/users`
- `{{messageId}}` — used by **Patch Message** and **Delete Message** in `messages/`. Paste in an `_id` from `GET /api/messages`

---

## Assertions (tests)

The Bruno files contain assertions that verify the response:

```
assert {
  res.status: eq 200
  res.body.status: eq ok
}
```

Run the assertions automatically with:

```bash
npm run bruno:test
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `ECONNREFUSED` | The server isn't running | Start it with `npm run dev` |
| `401` on protected routes | Not logged in | Run the Login request first |
| `404` on a route | The endpoint isn't implemented yet | Implement the route per the issue |
| `{{baseUrl}}` variable is empty | No environment selected | Select an environment in Bruno |
| Cookie isn't sent | The Bruno session was reset | Log in again |
