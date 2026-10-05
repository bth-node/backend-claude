import { test, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

test('GET /api/doc returns endpoint list', async () => {
  const res = await request(app).get('/api/doc')
  expect(res.status).toBe(200)
  expect(res.body.endpoints).toBeInstanceOf(Array)
  expect(res.body.endpoints.length).toBeGreaterThan(0)
})
