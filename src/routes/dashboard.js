// GET /api/me — current user's profile, protected by authMiddleware.
// See: issues/07-middleware.md

import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.js'

const router = Router()

router.get('/api/me', authMiddleware, async (req, res) => {
  res.json(req.user)
})

export default router
