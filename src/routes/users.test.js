import { test, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

test('GET /api/users returns an array', async () => {
  const res = await request(app).get('/api/users')
  expect(res.status).toBe(200)
  expect(res.body).toBeInstanceOf(Array)
  expect(res.body.length).toBeGreaterThan(0)
})

test('GET /api/users/:id returns a user', async () => {
  const users = await request(app).get('/api/users')
  const id = users.body[0].id

  const res = await request(app).get(`/api/users/${id}`)
  expect(res.status).toBe(200)
  expect(res.body.name).toBeDefined()
})

test('GET /api/users/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/users/507f1f77bcf86cd799439011')
  expect(res.status).toBe(404)
})
