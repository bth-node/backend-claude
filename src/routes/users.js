// Users routes — GET /api/users and GET /api/users/:id.
// See: issues/04-rest.md (in-memory) and issues/05-mongodb.md (database)

import { Router } from 'express'
import logger from '../logger.js'

const router = Router()

const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Clara' },
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
