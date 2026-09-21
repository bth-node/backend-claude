# API design

Conventions and principles for the REST API you build in the course.

**Relevant from**: issue 04 (REST) | **Deep dive**: [PHILOSOPHY.md](PHILOSOPHY.md)

---

## URL structure

```
GET    /api/users            → fetch all users
GET    /api/users/:id        → fetch one user
POST   /api/messages         → create a message
PATCH  /api/messages/:id     → update a message
DELETE /api/messages/:id     → delete a message
```

**Nouns, not verbs**: `/api/users` (not `/api/getUsers`). The HTTP method says what's being done.

**Plural**: `/api/messages` (not `/api/message`). The collection holds zero or more.

**Nesting for ownership**: avoid deep nesting. `/api/messages` filtered on the logged-in user via middleware — not `/api/users/:id/messages`.

---

## HTTP status codes

| Code | Meaning | When |
|---|---|---|
| 200 | OK | GET succeeded, PATCH/DELETE succeeded |
| 201 | Created | POST created a resource |
| 204 | No Content | DELETE succeeded, no body |
| 400 | Bad Request | Validation failed (missing fields, invalid format) |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | The resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g. email already registered) |
| 500 | Internal Server Error | Unhandled error |

**The rule**: the client should be able to tell what happened without reading the response body. The status code should be enough.

---

## Error format

Errors in this course use a simple format:

```json
{ "message": "Email and password are required" }
```

Or alternatively an error object:

```json
{ "error": "User not found" }
```

Pick one format and stick to it across the whole API. Consistency makes the client easier to write.

---

## Authentication

JWT in httpOnly cookies — not in the `Authorization` header. Cookies are sent automatically by the browser without the frontend code having to handle them.

```
POST /auth/login   → verifies credentials, sets an httpOnly cookie with the JWT
POST /auth/logout  → clears the cookie
```

`authMiddleware` verifies the cookie and sets `req.user` — every protected route uses it:

```js
router.get('/api/me', authMiddleware, async (req, res) => {
  res.json(req.user)
})
```

See [AUTH.md](AUTH.md) for a detailed walkthrough of the whole authentication flow.

---

## Validation

Input is validated in the route before it reaches the database:

```js
const { name, email, password } = req.body

if (!name?.trim() || !email?.trim() || !password) {
  return res.status(400).json({ message: 'Name, email and password are required' })
}
```

**Validate at the boundary**: the route is the boundary between the outside world (HTTP) and your application. Once data passes validation, you can trust it.

---

## `/api/doc` — self-documenting API

The `GET /api/doc` endpoint returns a list of every implemented endpoint. The frontend uses it to automatically unlock UI sections.

```json
{
  "version": "1.0",
  "endpoints": [
    { "method": "GET", "path": "/health", "auth": false, "description": "Server status" },
    { "method": "POST", "path": "/auth/login", "auth": false, "description": "Login and set cookie" },
    { "method": "GET", "path": "/api/messages", "auth": true, "description": "Messages for current user" }
  ]
}
```

Every new endpoint you implement should be added here — otherwise the corresponding UI section won't unlock.

---

## Conventions in this course

| Convention | Why |
|---|---|
| `_id` (MongoDB ObjectId) in URLs | Simple, Mongoose uses it directly |
| Always JSON responses (even errors) | Consistent for the client |
| `express.json()` on all routes | Body parsing always available |
| `httpOnly` cookies | Prevent XSS access to tokens |
| `.select('-password')` | The password never leaves the database unnecessarily |

---

## What a good API feels like

A good REST API is predictable:

- If `GET /api/users` returns a list, the client expects `GET /api/messages` to return a list too — the same pattern.
- If `POST /auth/register` returns `201`, the client expects `POST /api/messages` to return `201` as well.
- If `400` always has `{ message: "..." }`, the client never has to guess the format.

Consistency reduces the need for documentation. If everything works the same way, you only have to explain it once.
