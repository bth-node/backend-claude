import { test, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

test('POST /auth/register creates a new user', async () => {
  const email = `test-${Date.now()}@example.com`

  const res = await request(app)
    .post('/auth/register')
    .send({ name: 'Test User', email, password: 'testpass123' })

  expect(res.status).toBe(201)
  expect(res.body.user.name).toBe('Test User')
  expect(res.body.user.password).toBeUndefined()
})

test('POST /auth/register returns 409 for a duplicate email', async () => {
  const email = `test-${Date.now()}@example.com`
  const payload = { name: 'Test User', email, password: 'testpass123' }

  await request(app).post('/auth/register').send(payload)
  const res = await request(app).post('/auth/register').send(payload)

  expect(res.status).toBe(409)
})

test('POST /auth/login returns a token for correct credentials', async () => {
  const email = `test-${Date.now()}@example.com`
  const password = 'testpass123'

  await request(app).post('/auth/register').send({ name: 'Test User', email, password })

  const res = await request(app).post('/auth/login').send({ email, password })

  expect(res.status).toBe(200)
  expect(res.body.token).toBeDefined()
  expect(res.body.user.email).toBe(email)
})

test('POST /auth/login returns 401 for wrong password', async () => {
  const email = `test-${Date.now()}@example.com`

  await request(app)
    .post('/auth/register')
    .send({ name: 'Test User', email, password: 'testpass123' })

  const res = await request(app).post('/auth/login').send({ email, password: 'wrongpass' })

  expect(res.status).toBe(401)
})
