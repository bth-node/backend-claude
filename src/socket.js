// Socket.io chat — join/message/disconnect events. Chat history is in memory only.
// See: issues/08-chat.md

import logger from './logger.js'

const onlineUsers = new Map()

export function setupSocket(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connected')

    socket.on('join', (username) => {
      onlineUsers.set(socket.id, username)
      socket.broadcast.emit('message', { user: username, text: 'joined', system: true })
      io.emit('users', [...onlineUsers.values()])
    })

    socket.on('message', ({ user, text }) => {
      io.emit('message', { user, text })
    })

    socket.on('disconnect', () => {
      const username = onlineUsers.get(socket.id)
      onlineUsers.delete(socket.id)
      if (username) {
        io.emit('message', { user: username, text: 'left', system: true })
        io.emit('users', [...onlineUsers.values()])
      }
      logger.info('Socket disconnected')
    })
  })
}
