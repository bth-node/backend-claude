// Users routes — GET /api/users and GET /api/users/:id.
// See: issues/04-rest.md (in-memory) and issues/05-mongodb.md (database)

import { Router } from 'express'
import logger from '../logger.js'

const router = Router()

// _id mirrors id — the frontend already reads Mongoose's _id field, which
// doesn't exist until the mongodb issue replaces this in-memory array.
const users = [
  { id: '1', _id: '1', name: 'Alice Johansson', email: 'alice@example.com', avatar: 'alice.svg' },
  { id: '2', _id: '2', name: 'Bob Lindqvist', email: 'bob@example.com', avatar: 'bob.svg' },
  { id: '3', _id: '3', name: 'Clara Eriksson', email: 'clara@example.com', avatar: 'clara.svg' },
]

router.get('/api/users', (req, res) => {
  res.json(users)
})

router.get('/api/users/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id)

  if (!user) {
    logger.warn({ id: req.params.id }, 'User not found')
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(user)
})

export default router
