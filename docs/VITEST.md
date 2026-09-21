# Vitest

Testing with Vitest and supertest — unit tests and HTTP tests.

**Relevant from**: issue 04d (testing)

---

## Why Vitest?

Vitest is a test framework that shares configuration with Vite. It gives you:

- Fast execution (parallel workers)
- ES module support with no extra configuration
- A Jest-compatible API (the same `test`, `expect`, `describe`)
- Built-in coverage support (v8)

---

## Running tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode — reruns on file changes
npm run test:coverage # Run with a coverage report
```

---

## Configuration

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

| Setting | Value | Purpose |
|---|---|---|
| `provider` | `v8` | V8's built-in coverage — fast, needs nothing extra |
| `reporter` | `['text', 'html']` | Terminal output + HTML report in `coverage/` |

---

## Writing tests

### A simple test

```js
import { test, expect } from 'vitest'

test('1 + 1 equals 2', () => {
  expect(1 + 1).toBe(2)
})
```

### Testing an HTTP route with supertest

```js
import { test, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health')
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('ok')
})
```

`supertest` takes the Express app and sends HTTP requests without starting a real server. That keeps tests fast and independent of ports.

---

## File names

Vitest finds test files automatically based on their name:

- `health.test.js` — a test next to the source file
- `__tests__/health.js` — a test in a separate folder

In this course, tests live next to the source file: `routes/health.test.js` tests `routes/health.js`.

---

## Common assertions

```js
// Exact equality
expect(res.status).toBe(200)

// Object/array equality (deep equal)
expect(res.body).toEqual({ status: 'ok' })

// Contains specific fields
expect(res.body).toMatchObject({ status: 'ok' })

// Type
expect(res.body.status).toBeTypeOf('string')

// Array
expect(res.body).toBeInstanceOf(Array)
expect(res.body).toHaveLength(3)

// Truthy/falsy
expect(res.body.user).toBeTruthy()
expect(res.body.password).toBeUndefined()
```

---

## supertest — HTTP tests

### GET

```js
const res = await request(app).get('/api/users')
expect(res.status).toBe(200)
expect(res.body).toBeInstanceOf(Array)
```

### POST with a JSON body

```js
const res = await request(app)
  .post('/auth/register')
  .send({ name: 'Test', email: 'test@test.com', password: 'secret123' })
expect(res.status).toBe(201)
```

### With a cookie (authenticated requests)

```js
// 1. Log in and save the cookie
const login = await request(app)
  .post('/auth/login')
  .send({ email: 'alice@example.com', password: 'password123' })

const cookie = login.headers['set-cookie']

// 2. Use the cookie on the next request
const res = await request(app)
  .get('/api/me')
  .set('Cookie', cookie)

expect(res.status).toBe(200)
expect(res.body.email).toBe('alice@example.com')
```

---

## Coverage

```bash
npm run test:coverage
```

Generates:
- Terminal output with a percentage per file
- An HTML report in `coverage/` — open `coverage/index.html` in the browser

| Metric | Meaning |
|---|---|
| Statements | Share of lines that run |
| Branches | Share of if/else branches that are tested |
| Functions | Share of functions that are called |
| Lines | Share of lines (similar to statements) |

100% coverage doesn't mean the code is correct — it only means every line ran at least once.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `vitest: command not found` | Not installed | `npm install` |
| Tests time out | A MongoDB connection in `server.js` | Import `app` from `server.js`, not `index.js` |
| `EADDRINUSE` | Multiple tests start the server | Use `supertest(app)` instead of `app.listen()` |
| Tests pass locally but fail in CI | Missing environment variables | Check that CI has `MONGODB_URI` etc. |
| Coverage shows 0% | Wrong config path | Check `vitest.config.js` |
