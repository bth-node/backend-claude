// GET /api/doc — self-describing API reference.
// See: issues/04b-api-doc.md

import { Router } from 'express'

const router = Router()

router.get('/api/doc', (req, res) => {
  res.json({
    version: '1.0',
    endpoints: [
      { method: 'GET', path: '/health', auth: false, description: 'Server status' },
      {
        method: 'GET',
        path: '/api/doc',
        auth: false,
        description: 'API reference (this endpoint)',
      },
      { method: 'GET', path: '/api/users', auth: false, description: 'List all users' },
      { method: 'GET', path: '/api/users/:id', auth: false, description: 'Get one user by ID' },
    ],
  })
})

export default router
