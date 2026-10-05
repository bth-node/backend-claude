// Entry point — lifecycle: start the server and handle graceful shutdown.
// See: issues/03-express.md, issues/08-chat.md

import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import app from './server.js'
import logger from './logger.js'
import { setupSocket } from './socket.js'

const PORT = process.env.PORT || 3000

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
logger.info('Connected to MongoDB')

const httpServer = createServer(app)
const io = new Server(httpServer)
setupSocket(io)

httpServer.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`)
})

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`)
    process.exit(1)
  }
  throw err
})

const shutdown = () => {
  io.close()
  httpServer.closeAllConnections()
  httpServer.close(async () => {
    await mongoose.disconnect()
    logger.info('Server stopped')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
