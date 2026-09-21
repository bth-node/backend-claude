// Collects and registers all routes.
// See: issues/03-express.md

import { Router } from 'express'
import health from './health.js'
import users from './users.js'
import doc from './doc.js'

const router = Router()

router.use(health)
router.use(users)
router.use(doc)

export default router
