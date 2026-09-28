import { test, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

test('GET /api/me returns the logged-in user profile', async () => {
  const email = `test-${Date.now()}@example.com`
  const password = 'testpass123'

  await request(app).post('/auth/register').send({ name: 'Test User', email, password })

  const login = await request(app).post('/auth/login').send({ email, password })
  const cookie = login.headers['set-cookie']

  const res = await request(app).get('/api/me').set('Cookie', cookie)

  expect(res.status).toBe(200)
  expect(res.body.email).toBe(email)
})

test('GET /api/me returns 401 without a cookie', async () => {
  const res = await request(app).get('/api/me')

  expect(res.status).toBe(401)
})
