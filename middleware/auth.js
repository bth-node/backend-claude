// Auth middleware — verifies the JWT cookie and attaches req.user.
// See: issues/07-middleware.md

import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'
import logger from '../src/logger.js'

export async function authMiddleware(req, res, next) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(payload.userId).select('-password')

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    next()
  } catch {
    logger.warn('Invalid or expired token')
    return res.status(401).json({ message: 'Not authenticated' })
  }
}
