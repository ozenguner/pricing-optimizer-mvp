import { Router } from 'express'
import { param } from 'express-validator'
import { getPublicRateCard } from '../controllers/rateCardController.js'

const router = Router()

// Public route for shared rate cards (no authentication required)
router.get('/:token', [
  param('token').isUUID().withMessage('Invalid share token')
], getPublicRateCard)

export default router