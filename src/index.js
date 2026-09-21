// Entry point — lifecycle: start the server and handle graceful shutdown.
// See: issues/03-express.md

import app from './server.js'
import logger from './logger.js'

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`)
    process.exit(1)
  }
  throw err
})

const shutdown = () =>
  server.close(() => {
    logger.info('Server stopped')
    process.exit(0)
  })

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
