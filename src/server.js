// Express app — middleware and routes.
// See: issues/03-express.md

import express from 'express'
import routes from './routes/index.js'
import logger from './logger.js'

const app = express()

app.use(express.json())
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request')
  next()
})
app.use(routes)
app.use(express.static('public'))

export default app
