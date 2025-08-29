import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createRateCard,
  getRateCards,
  getRateCard,
  updateRateCard,
  deleteRateCard,
  generateShareToken,
  revokeShareToken,
  getPublicRateCard
} from '../controllers/rateCardController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

const pricingModelValidation = body('pricingModel')
  .isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription'])
  .withMessage('Invalid pricing model')

const rateCardValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  pricingModelValidation,
  body('data').isObject().withMessage('Data must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('folderId').optional().isUUID().withMessage('Invalid folder ID')
]

// Protected routes (require authentication)
router.get('/', authenticateToken, [
  query('folderId').optional().isUUID().withMessage('Invalid folder ID')
], getRateCards)

router.post('/', authenticateToken, rateCardValidation, createRateCard)

router.get('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], getRateCard)

router.put('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('pricingModel').optional().isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('folderId').optional().isUUID().withMessage('Invalid folder ID')
], updateRateCard)

router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], deleteRateCard)

// Share token management
router.post('/:id/share', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], generateShareToken)

router.delete('/:id/share', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], revokeShareToken)

// Public route (no authentication required)
router.get('/shared/:shareToken', [
  param('shareToken').isUUID().withMessage('Invalid share token')
], getPublicRateCard)

export default router