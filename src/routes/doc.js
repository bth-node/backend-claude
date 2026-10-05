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
      {
        method: 'GET',
        path: '/api/users',
        auth: false,
        description: 'List all users (from MongoDB)',
      },
      {
        method: 'GET',
        path: '/api/users/:id',
        auth: false,
        description: 'Get one user by ID (from MongoDB)',
      },
      { method: 'POST', path: '/auth/register', auth: false, description: 'Register a new user' },
      { method: 'POST', path: '/auth/login', auth: false, description: 'Login and set cookie' },
      { method: 'POST', path: '/auth/logout', auth: false, description: 'Clear the auth cookie' },
      { method: 'GET', path: '/api/me', auth: true, description: 'Current user profile' },
      {
        method: 'GET',
        path: '/api/messages',
        auth: true,
        description: 'Messages for current user',
      },
      { method: 'POST', path: '/api/messages', auth: true, description: 'Create a message' },
      { method: 'PATCH', path: '/api/messages/:id', auth: true, description: 'Update a message' },
      { method: 'DELETE', path: '/api/messages/:id', auth: true, description: 'Delete a message' },
      {
        method: 'GET',
        path: '/api/messages/stream',
        auth: true,
        description: 'SSE stream of new messages',
      },
    ],
  })
})

export default router
