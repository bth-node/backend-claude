// Collects and registers all routes.
// See: issues/03-express.md

import { Router } from 'express'
import health from './health.js'

const router = Router()

// TODO: register route files here — add one line per route file as the project grows
router.use(health)

export default router
