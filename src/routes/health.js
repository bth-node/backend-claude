// GET /health — reports server status.
// See: issues/03-express.md

import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
