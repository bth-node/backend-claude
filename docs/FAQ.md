# FAQ — Common questions and problems

Troubleshooting and common pitfalls.

---

## A port is blocked — how do I find what's using it?

Find which process is listening on a port (e.g. 3000):

```bash
lsof -i :3000
```

The output shows the process ID (PID) and program name. Kill the process:

```bash
kill <PID>
```

If it doesn't shut down:

```bash
kill -9 <PID>
```

The most common cause: an earlier `npm run dev` that wasn't shut down properly, or a Docker container still running. Check Docker too:

```bash
docker ps
docker compose down
```

---

## MongoDB won't start / won't connect

### The container isn't running

```bash
docker compose ps        # Check whether mongodb is running
docker compose up -d     # Start it
```

### Wrong port

Check that `MONGO_PORT` in `.env` matches the port in `MONGODB_URI`:

```
MONGO_PORT=27017
MONGODB_URI=mongodb://localhost:27017/node
```

If you change `MONGO_PORT`, you have to change `MONGODB_URI` too.

### "Connection refused"

The MongoDB container takes a couple of seconds to start. Try again after a few seconds, or check the logs:

```bash
docker compose logs mongodb
```

---

## npm run dev won't start

### "Cannot find module"

```bash
npm install     # Install dependencies
```

### ".env not found" / missing environment variables

```bash
cp .env.example .env    # Create .env from the template
```

Edit `.env` and make sure `MONGODB_URI` and `JWT_SECRET` are set.

### "SyntaxError: Cannot use import statement"

Check that `"type": "module"` is present in `package.json`. This course uses ES modules.

---

## Authentication doesn't work

### 401 on every protected route

- Have you logged in? Run `POST /auth/login` in Bruno or through the frontend.
- Has the server been restarted? JWT_SECRET changes between sessions if you regenerate it — log in again.
- Run `npm run seed` if the test users are missing.

### The cookie isn't set

- Check that `cookie-parser` is installed and active in `server.js`.
- `sameSite: 'strict'` can block cookies on cross-origin requests — use `'lax'`.
- Inspect cookies in the browser: DevTools → Application → Cookies.

### req.user is undefined

- `authMiddleware` is missing from the route chain.
- `cookie-parser` isn't mounted before the routes.

See [AUTH.md](AUTH.md) for the full authentication flow.

---

## The frontend doesn't show the right data

### UI sections don't unlock

The frontend reads `GET /api/doc` to decide which sections to show. Check that your `/api/doc` endpoint lists the new route.

### Forms don't work

The frontend sends `credentials: 'include'` on every fetch call. If the server doesn't set the cookie correctly (httpOnly, sameSite), authenticated calls won't work.

### Old data is shown

Check that `Cache-Control: no-store` is set in `express.static()`:

```js
app.use(express.static('../public', {
  setHeaders: (res) => res.set('Cache-Control', 'no-store'),
}))
```

---

## Tests fail

### EADDRINUSE

The tests try to start the server on a port that's already in use. Import `app` from `server.js` — not `index.js`:

```js
// Correct — no ports involved
import app from '../server.js'
import request from 'supertest'

// Wrong — index.js starts the server and listens on the port
import app from '../index.js'
```

### Timeout

Tests can time out if they're waiting for a MongoDB connection. Make sure tests don't depend on a running database (or mock the connection).

---

## Socket.io doesn't work

### The client doesn't connect

- Socket.io must be mounted on the HTTP server, not the Express app.
- Check that `index.js` has `const io = new Server(httpServer)` — not `new Server(app)`.

### /socket.io/socket.io.js returns 404

Socket.io serves the client library automatically. If it doesn't work:
- Check that the Socket.io server is created with `httpServer` (not `app`).
- Make sure `httpServer.listen()` is called (not `app.listen()`).

---

## The SSE stream isn't receiving events

- Check that `res.flushHeaders()` is called after the headers are set.
- `Cache-Control: no-cache` must be set.
- Check that the client has `withCredentials: true` (for cookies).

See [SSE.md](SSE.md) for full troubleshooting.

---

## ESLint / Prettier errors

### "Parsing error: import not found"

Check that the ESLint configuration supports ES modules. See `eslint.config.js`.

### Formatting on commit

Run manually:

```bash
npm run lint       # Show lint errors
npm run format     # Format automatically
```
