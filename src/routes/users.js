// Users routes — GET /api/users and GET /api/users/:id.
// See: issues/04-rest.md (in-memory) and issues/05-mongodb.md (database)

import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import logger from '../logger.js'

const router = Router()

router.get('/api/users', async (req, res) => {
  const users = await User.find().select('-password')
  res.json(users)
})

router.get('/api/users/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  const user = await User.findById(req.params.id).select('-password')

  if (!user) {
    logger.warn({ id: req.params.id }, 'User not found')
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(user)
})

export default router
