// Auth routes — register, login, logout.
// See: issues/06-register.md and issues/06b-login-logout.md

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import logger from '../logger.js'

const router = Router()

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' })
  }
  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Invalid email address' })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const hash = await bcrypt.hash(password, 10)

  try {
    const user = await User.create({ name, email, password: hash })
    logger.info({ userId: user._id }, 'User registered')
    res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' })
    }
    throw err
  }
})

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await User.findOne({ email })
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    logger.warn({ email }, 'Failed login attempt')
    return res.status(401).json({ message: 'Invalid email or password' })
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET)
  res.cookie('token', token, COOKIE_OPTS)

  logger.info({ userId: user._id }, 'User logged in')
  res.json({ token, user: { _id: user._id, name: user.name, email: user.email } })
})

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

export default router
