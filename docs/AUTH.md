# Authentication

The whole authentication flow, step by step — registration, login, cookies, JWT and protected routes.

**Relevant from**: issue 06 (register), 06b (login), 07 (protected routes)

---

## Overview

```
Register       → Hash password → Save in MongoDB → Return user
Log in         → Verify password → Create JWT → Set cookie → Return user + token
Protected route → Read cookie → Verify JWT → Fetch user → req.user
Log out        → Clear cookie
```

Three techniques work together:

| Technique | Purpose |
|---|---|
| **bcrypt** | Hashes passwords so they're never stored in plain text |
| **JWT** | A compact token that proves who the user is |
| **httpOnly cookie** | Transports the JWT securely, without JavaScript being able to read it |

---

## bcrypt — password hashing

Passwords are never stored in plain text. `bcrypt` is deliberately slow — that makes brute force impractical.

### Registration — hashing

```js
import bcrypt from 'bcryptjs'

const hash = await bcrypt.hash(password, 10)
const user = await User.create({ name, email, password: hash })
```

The number `10` is the cost factor — the number of rounds. Higher = slower = more secure. `10` takes ~100ms, `12` takes ~250ms.

### Login — verifying

```js
const user = await User.findOne({ email })
const match = await bcrypt.compare(password, user.password)

if (!match) {
  return res.status(401).json({ message: 'Invalid email or password' })
}
```

`bcrypt.compare` extracts the salt and cost factor from the hash automatically — you don't need to store them separately.

### Security note

Always return the same error message whether the email or the password is wrong:

```js
// Correct — reveals nothing
res.status(401).json({ message: 'Invalid email or password' })

// Wrong — reveals that the email address exists in the database
res.status(401).json({ message: 'Wrong password' })
```

---

## JWT — JSON Web Token

A JWT is a signed token that carries data (the payload). The server creates it at login and verifies it on every request.

### Creating a token

```js
import jwt from 'jsonwebtoken'

const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET
)
```

`JWT_SECRET` in `.env` is the secret that signs the token. If anyone gets hold of it, they can create valid tokens.

### Verifying a token

```js
const payload = jwt.verify(token, process.env.JWT_SECRET)
// payload.userId → the user's _id
```

`jwt.verify` throws an error if the token is invalid, expired, or signed with the wrong secret.

### What's inside a JWT?

A JWT has three parts separated by `.`:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2ODMifQ.abc123signature
|---- header ----|  |---- payload ----|  |-- signature --|
```

The payload is base64-encoded, **not encrypted**. Anyone can read it. Never store sensitive data (passwords, national ID numbers) in a JWT.

---

## Cookies — the transport layer

The cookie transports the JWT between client and server. `httpOnly` means JavaScript can't read it — that protects against XSS.

### Setting the cookie at login

```js
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
}

res.cookie('token', token, COOKIE_OPTS)
```

| Option | Effect |
|---|---|
| `httpOnly: true` | `document.cookie` can't read it — protects against XSS |
| `sameSite: 'lax'` | The cookie isn't sent on cross-site POST — protects against CSRF |
| `maxAge` | The cookie expires after 7 days |

### Clearing the cookie at logout

```js
res.clearCookie('token')
```

### The frontend sends the cookie automatically

The frontend uses `credentials: 'include'` in fetch calls — the browser attaches the cookie automatically:

```js
fetch('/api/me', { credentials: 'include' })
```

You never need to send the token manually in JavaScript.

---

## authMiddleware — protected routes

Middleware that verifies the JWT cookie and fetches the user from the database:

```js
export async function authMiddleware(req, res, next) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET)
  req.user = await User.findById(payload.userId).select('-password')

  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  next()
}
```

**Note**: `.select('-password')` — the password hash must never end up in `req.user`.

### Using the middleware on routes

```js
// Anyone with a valid cookie can access /api/me
router.get('/api/me', authMiddleware, async (req, res) => {
  res.json(req.user)
})
```

---

## Ownership — "only my resources"

For routes where a user should only be able to access their own resources, filter on `req.user._id`:

```js
// Fetch only the logged-in user's messages
const messages = await Message.find({ userId: req.user._id })

// Update — only if it's my message
const message = await Message.findOneAndUpdate(
  { _id: req.params.id, userId: req.user._id },
  { text: req.body.text },
  { new: true }
)

if (!message) {
  return res.status(404).json({ error: 'Message not found' })
}
```

Return `404` (not `403`) if the resource doesn't exist *or* doesn't belong to the user — don't reveal that it exists.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `401` on everything | JWT_SECRET differs between sessions | Restart the server, log in again |
| Cookie isn't set | `sameSite: 'strict'` blocks cross-origin | Use `sameSite: 'lax'` |
| Cookie isn't visible in DevTools | `httpOnly: true` hides it from JavaScript | Check Application → Cookies in DevTools |
| `jwt.verify` throws an error | Token expired or wrong secret | Log in again |
| `req.user` is `undefined` | `authMiddleware` is missing on the route | Add `authMiddleware` to the route chain |
| Seed users can't log in | Passwords not hashed | Run `npm run seed` |

### Inspecting a JWT

Paste the token into [jwt.io](https://jwt.io) to see the payload (header + payload are just base64, not encrypted).

### Testing auth with Bruno

1. Run **Login** in Bruno (auth/login)
2. The cookie is saved automatically in the Bruno session
3. Run **Get Me** (dashboard/get-me) — should return the logged-in user
