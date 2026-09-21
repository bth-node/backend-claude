// GET /health — reports server status.
// See: issues/03-express.md

import { Router } from 'express'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
