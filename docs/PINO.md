# Pino

Structured logging with Pino — fast, JSON-based logging for Node.js.

**Relevant from**: issue 04c (logging)

---

## Why Pino instead of console.log?

| | `console.log` | Pino |
|---|---|---|
| Format | Unstructured text | JSON (machine-readable) |
| Levels | No | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| Performance | Synchronous | Asynchronous — doesn't block the event loop |
| Filtering | Manual | Automatic per log level |

In development, Pino looks like plain text (via `pino-pretty`). In production, it produces JSON that log tools can parse and search.

---

## Configuration

```js
import pino from 'pino'

const logger = pino(
  process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
    : {}
)

export default logger
```

| Environment | Format | Why |
|---|---|---|
| Development | `pino-pretty` (colored text, one line per log) | Readable for humans |
| Production | Raw JSON | Machine-readable for log tools |

---

## Log levels

```js
logger.trace('Detailed debug info')           // 10
logger.debug('Debug info')                     // 20
logger.info('Normal operation')                // 30  ← default
logger.warn('Potential problem')               // 40
logger.error('Error that needs attention')     // 50
logger.fatal('Application cannot continue')    // 60
```

Logs below the configured level are filtered out. The default is `info` (30) — `trace` and `debug` aren't shown.

---

## Structured logging — object + message

Pino logs objects (context) separately from the message:

```js
// Good — structured, searchable
logger.info({ userId: user._id }, 'User logged in')
// → {"level":30,"userId":"683abc...","msg":"User logged in"}

// Less good — everything in one string, hard to search
logger.info(`User ${user._id} logged in`)
// → {"level":30,"msg":"User 683abc... logged in"}
```

The first argument is an object with context data. The second argument is the message. Log tools can filter on `userId` without parsing strings.

---

## Where do we log?

### Request logging (middleware)

```js
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url })
  next()
})
```

Logs every incoming request.

### Business events

```js
// Registration
logger.info({ userId: user._id }, 'User registered')

// Login
logger.info({ userId: user._id }, 'User logged in')

// Failed login
logger.warn({ email }, 'Failed login attempt')

// Message created
logger.info({ userId: req.user._id }, 'Message created')
```

### Errors

```js
// Invalid token
logger.warn('Invalid or expired token')

// Unexpected error
logger.error(err, 'Unexpected error')
```

`logger.error(err, msg)` — Pino automatically logs `err.message`, `err.stack`, and `err.code`.

---

## What NOT to log

```js
// WRONG — the password ends up in the log
logger.info({ email, password }, 'Login attempt')

// WRONG — the whole request body might contain sensitive data
logger.info(req.body, 'Request received')

// WRONG — the JWT token in the log
logger.info({ token }, 'Token created')
```

Never log:
- Passwords (neither plain text nor hashed)
- JWT tokens
- Full request bodies (may contain passwords)

---

## pino-pretty

`pino-pretty` formats JSON logs into readable text during development:

**Without pino-pretty** (raw JSON):
```
{"level":30,"time":1719300000,"method":"GET","url":"/health","msg":""}
```

**With pino-pretty** (formatted):
```
[14:20:00] INFO: GET /health
```

`pino-pretty` is a dev dependency — it isn't installed in production.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| No logs show up | The log level is too high | Lower the level: `pino({ level: 'debug' })` |
| JSON instead of pretty output | `NODE_ENV=production` | Run without `NODE_ENV` or set it to `development` |
| `pino-pretty` not found | Not installed | `npm install -D pino-pretty` |
| Logs are buffered | Pino's asynchronous writing | Normal behavior — logs flush automatically |
