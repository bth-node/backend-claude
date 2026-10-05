// Dashboard routes — GET /api/me and the messages CRUD + SSE stream, all protected by authMiddleware.
// See: issues/07-middleware.md, issues/07b-messages.md, issues/07c-messages-edit.md and
// issues/09-sse.md

import { Router } from 'express'
import mongoose from 'mongoose'
import { authMiddleware } from '../../middleware/auth.js'
import Message from '../models/Message.js'
import logger from '../logger.js'

const router = Router()

// Open SSE connections — one response object per connected browser tab or terminal.
const clients = new Set()

router.get('/api/me', authMiddleware, async (req, res) => {
  res.json(req.user)
})

router.get('/api/messages', authMiddleware, async (req, res) => {
  const messages = await Message.find({ userId: req.user._id }).sort({ createdAt: -1 })
  res.json(messages)
})

router.get('/api/messages/stream', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  res.userId = req.user._id.toString()
  clients.add(res)
  logger.info({ userId: req.user._id }, 'SSE client connected')

  req.on('close', () => {
    clients.delete(res)
    logger.info({ userId: req.user._id }, 'SSE client disconnected')
  })
})

router.post('/api/messages', authMiddleware, async (req, res) => {
  const text = req.body.text?.trim()

  if (!text) {
    return res.status(400).json({ message: 'Message text is required' })
  }

  const message = await Message.create({ userId: req.user._id, text })
  logger.info({ userId: req.user._id }, 'Message created')

  const messageWithUser = {
    ...message.toObject(),
    user: { name: req.user.name, avatar: req.user.avatar },
  }
  const payload = `data: ${JSON.stringify(messageWithUser)}\n\n`
  for (const client of clients) {
    // The sender already has the message from the REST response
    if (client.userId !== req.user._id.toString()) {
      client.write(payload)
    }
  }

  res.status(201).json(message)
})

router.patch('/api/messages/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid message id' })
  }

  const text = req.body.text?.trim()

  if (!text) {
    return res.status(400).json({ message: 'Message text is required' })
  }

  const message = await Message.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { text },
    { new: true }
  )

  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  res.json(message)
})

router.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid message id' })
  }

  const message = await Message.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  res.status(204).send()
})

export default router
