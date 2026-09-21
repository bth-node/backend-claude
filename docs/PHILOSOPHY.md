# Design philosophies

Principles that help you make decisions when there's no obviously right answer.

---

## Separation of Concerns

**Every part of the code does one thing.**

- `server.js` configures Express — it doesn't start the server.
- `index.js` starts the server — it doesn't configure routes.
- Middleware authenticates — it doesn't know what happens afterward.
- Routes handle HTTP — they don't know how the database looks internally.

**Think of it this way**: if you change how authentication works, only the auth files should need to change. If the change spreads to routes, messages, and sockets — you've mixed responsibilities.

---

## Convention over Configuration

**Follow established patterns instead of inventing your own.**

REST has conventions: `GET` fetches, `POST` creates, `DELETE` removes. Plurals in URLs (`/api/users`, not `/api/user`). Status codes that communicate (`201` = created, `404` = doesn't exist).

Conventions make your API predictable. If `GET /api/users` returns a list, the client expects `GET /api/messages` to do the same. If you break the pattern, you have to document why — and every exception makes the API harder to use.

Express also has conventions: middleware runs in order, `next()` moves on, error handlers take four arguments. Follow them.

---

## Fail Fast, Fail Loud

**Catch errors early and communicate them clearly.**

```js
// Good — the error is caught at the boundary
if (!email?.trim() || !password) {
  return res.status(400).json({ message: 'Email and password are required' })
}

// Bad — the error shows up much later as "Cannot read property of undefined"
const user = await User.findOne({ email })
```

Validate input in the route, not deep inside a database query. Return specific error messages, not generic ones. Log failed login attempts — silent failure hides problems.

**Exception**: security-related responses should be vague. "Invalid email or password" — not "No user with that email" (that reveals which email addresses exist).

---

## Principle of Least Surprise

**The code should behave the way the reader expects.**

- A function named `getUser` should fetch a user — not change it.
- `DELETE /api/messages/:id` should return `204` — not `200` with a message.
- An API that requires authentication should return `401` — not `403` or `500`.
- If every other route returns JSON, a route shouldn't return plain text.

Every time you surprise a user of your API, it costs them time debugging and understanding it.

---

## Stateless Requests

**Every request is independent — the server doesn't remember previous requests.**

The server has no per-client "state". Authentication is sent with every request (the JWT in the cookie). The server verifies the token, finds the user, and performs the operation — without knowing what the client did last time.

**Why?** It makes the server easier to scale. Multiple servers can handle requests from the same client without synchronizing memory.

**Exception**: Socket.io and SSE are stateful — the connection stays alive. That's deliberate and limited to real-time features.

---

## Don't Repeat Yourself (DRY) — but not at any cost

**Duplication is a problem. The wrong abstraction is a worse problem.**

If three routes validate email format the same way — extract it. But if two functions happen to have similar code for completely different reasons — leave them be.

```js
// Good DRY — same logic, same purpose
export function authMiddleware(req, res, next) { /* ... */ }
// Used on every protected route

// Bad DRY — forces together things that don't belong together
export function handleRequest(type, req, res) {
  if (type === 'message') { /* ... */ }
  if (type === 'user') { /* ... */ }
}
```

**YAGNI (You Ain't Gonna Need It)**: don't build things "in case we need it later". Write the code that solves today's problem. Refactor when you actually have three cases, not when you think you might get three cases.

---

## Security by Default

**Security isn't a feature you add — it's a way of building.**

- `httpOnly` on cookies — JavaScript can never read the token.
- `no-store` in Cache-Control — protected data isn't cached.
- `.select('-password')` — the password never leaves the database unnecessarily.
- `sameSite: 'lax'` — the cookie isn't sent on cross-site requests.
- `bcrypt.hash(password, 10)` — passwords are never stored in plain text.

**Think of it this way**: assume someone sees every HTTP response, reads every log file, and has access to every cookie. What could they get to? Minimize it.

---

## Information Hiding

**Don't reveal more than necessary.**

The login route returns the same error message — `Invalid email or password` — whether it's the email that's missing or the password that's wrong. If the messages were different, an attacker could use the error to figure out which email addresses are registered, just by reading the response.

**Think of it this way**: every extra detail in a response is information someone else can use — sometimes against you. Returning less than you know is sometimes the right choice.

---

## Principle of Least Privilege

**Only grant access to what's actually needed.**

```js
// The filter is always tied to the logged-in user
Message.find({ userId: req.user._id })
```

Regardless of what the client sends, the query is always scoped to the logged-in user's own data. A user who tries to read someone else's messages gets an empty list — not an error, not a leak.

**Think of it this way**: every query, every route should have access to exactly the data it needs for its job — not more "just in case" or because it was easier to write.

---

## Defensive Programming

**Write code that handles what *can* go wrong — not just what *usually* goes right.**

```js
req.user = await User.findById(payload.userId).select('-password')

if (!req.user) {
  return res.status(401).json({ message: 'Not authenticated' })
}
```

Under normal operation, the user always exists. But a deleted account, a tampered token, or a manually edited database can all produce a valid JWT that points to a user who no longer exists. The check costs one line and prevents a crash further down in the code.

---

## Trust No Input

**Validate everything that comes from outside, before you use it.**

The HTTP request body is user-controlled — anyone can send any value, in any format, with curl or Bruno. Validation at the route is the boundary between the untrustworthy outside world and the application's trustworthy interior. Once data has passed validation, the rest of the code can trust it without questioning every field again.

---

## Explicit over Implicit

**Be clear about what the code does and what it expects.**

```js
// Explicit — the reader sees exactly what's exported
export async function authMiddleware(req, res, next) { /* ... */ }

// Implicit — which function in the file is "the" one?
export default auth
```

```js
// Explicit — clear what the cookie is called and how long it lives
res.cookie('token', token, {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})

// Implicit — magic number, what is 604800000?
res.cookie('token', token, { maxAge: 604800000 })
```

Name variables after what they contain, not after their type. `userCount` — not `n`. `hashedPassword` — not `pw`.

---

## Composition over Inheritance

**Build functionality by combining small parts, not by inheriting from large ones.**

Express middleware is one example: instead of inheriting from an "AuthenticatedRoute" class, you compose functions into a chain.

```js
// Composition — each middleware does one thing, the chain forms the whole
router.post('/api/messages', authMiddleware, async (req, res) => { /* ... */ })

// Each part can be tested, swapped out, or changed independently
```

In the Node.js world, this is usually expressed as functions calling functions — not classes inheriting from classes.

---

## Practical over Perfect

**Good enough today beats perfect in a month.**

This course builds a working application, not a perfect architecture. That means:

- Logic directly in routes instead of separate controllers/services — because you have 5 routes, not 50.
- Environment variables instead of a configuration system — because you have 4 settings, not 40.
- `console.log` is replaced with Pino — but you don't need config files for per-module log levels.

**The rule**: if you're spending more time on the infrastructure than on the problem it's meant to solve — step back.

---

## How to think through a design decision

When you're facing a choice, ask these questions in order:

1. **Is there a convention?** If Express, REST, or Node.js has an established pattern — follow it.
2. **What would surprise the reader least?** If a colleague reads the code a year from now, which variant would they understand faster?
3. **What's easiest to change?** If you choose wrong — which variant is easiest to refactor away from?
4. **What's needed now?** Not in three sprints, not "in case we scale" — now.

If the answer is still unclear: pick the simpler option. Simplicity is rarely wrong.
