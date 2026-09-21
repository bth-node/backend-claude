# Express

Express 5.x — routing, middleware and server setup.

**Relevant from**: issue 03 (Express)

---

## Why server.js and index.js?

The project splits the server into two files:

| File | Responsibility |
|---|---|
| `server.js` | Creates and configures the Express app (middleware, routes, static files) |
| `index.js` | Starts the HTTP server, connects to MongoDB, sets up Socket.io |

```
index.js  →  imports app from server.js
          →  connects to MongoDB
          →  creates the HTTP server
          →  starts Socket.io
          →  listens on a port
```

**Why?** Tests can import `app` from `server.js` without starting a real server:

```js
import app from '../server.js'
import request from 'supertest'

const res = await request(app).get('/health')
```

If `server.js` also started the server (`app.listen(...)`), every test would start a new server on the same port.

---

## Middleware

Middleware is functions that run in order on every request. Each middleware does one thing and calls `next()` to move on.

### Application middleware (applies to every request)

```js
app.use(express.json())        // Parses JSON in the request body
app.use(cookieParser())        // Parses cookies → req.cookies
app.use((req, _res, next) => {  // Logging
  logger.info({ method: req.method, url: req.url })
  next()
})
```

Order matters — `express.json()` must come before routes that read `req.body`.

### Route middleware (applies to specific routes)

```js
router.get('/api/me', authMiddleware, async (req, res) => {
  // authMiddleware has already verified the cookie
  // and set req.user
  res.json(req.user)
})
```

`authMiddleware` sits between the URL match and the route handler. If it doesn't call `next()` (e.g. it returns 401), the handler is never reached.

### The middleware chain, visualized

```
Request → express.json() → cookieParser() → logger → routes → static files → Response
                                                ↓
                              /api/me → authMiddleware → handler
```

---

## Routing

### Router objects

Each routes file creates its own Router:

```js
import { Router } from 'express'
const router = Router()

router.get('/api/users', async (req, res) => {
  const users = await User.find().select('-password')
  res.json(users)
})

export default router
```

### Registering routes

All routers are collected in `routes/index.js`:

```js
import { Router } from 'express'
import healthRouter from './health.js'
import usersRouter from './users.js'
import authRouter from './auth.js'

const router = Router()
router.use(healthRouter)
router.use(usersRouter)
router.use(authRouter)

export default router
```

`server.js` mounts them with `app.use(routes)`.

---

## Static files

Express serves the frontend from `public/`:

```js
app.use(express.static('../public', {
  setHeaders: (res) => res.set('Cache-Control', 'no-store'),
}))
```

`no-store` prevents caching — important during development so changes show up right away. `../public` points upward from `solution/` to the repo root.

Static files are mounted *after* routes — if a route matches the URL, the route handles it, not the static file.

---

## Express 5

This course uses Express 5. The key differences from Express 4:

| Express 4 | Express 5 |
|---|---|
| `app.del()` | Removed — use `app.delete()` |
| Async errors crash the app | Async errors are caught automatically |
| `res.send(status)` | Removed — use `res.sendStatus(status)` |

The most important improvement: async route handlers that throw are caught automatically, without `try/catch`:

```js
// Express 5 — the error is caught automatically
router.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})
```

---

## cookie-parser

`cookie-parser` parses the `Cookie` header and makes cookies available via `req.cookies`:

```js
import cookieParser from 'cookie-parser'
app.use(cookieParser())

// In a route:
const token = req.cookies?.token
```

Without `cookie-parser`, `req.cookies` is `undefined`.

---

## Error handling

Express 5 catches async errors automatically. If you need custom error handling, add an error handler last in the middleware chain:

```js
app.use((err, req, res, next) => {
  logger.error(err)
  res.status(500).json({ message: 'Internal server error' })
})
```

Error handlers take **four arguments** — that's how Express recognizes them as error handlers.

---

## Graceful shutdown

`index.js` handles SIGTERM/SIGINT to shut down cleanly:

```js
const shutdown = () => {
  io.close()
  httpServer.close(async () => {
    await mongoose.disconnect()
    logger.info('Server stopped')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

Ctrl+C sends SIGINT → closes Socket.io → closes the HTTP server → disconnects MongoDB → exits.
