import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createRateCard,
  getRateCards,
  getRateCard,
  updateRateCard,
  deleteRateCard,
  duplicateRateCard,
  generateShareToken,
  revokeShareToken
} from '../controllers/rateCardController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

const pricingModelValidation = body('pricingModel')
  .isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription'])
  .withMessage('Invalid pricing model')

const rateCardValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'JPY']).withMessage('Invalid currency'),
  body('ownerTeam').optional().isIn(['Marketing', 'Sales', 'Pricing', 'Finance']).withMessage('Invalid owner team'),
  pricingModelValidation,
  body('data').isObject().withMessage('Data must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('skuId').optional().isUUID().withMessage('Invalid SKU ID'),
  body('folderId').optional().isUUID().withMessage('Invalid folder ID')
]

// Protected routes (require authentication)
router.get('/', authenticateToken, [
  query('folderId').optional().isUUID().withMessage('Invalid folder ID'),
  query('skuId').optional().isUUID().withMessage('Invalid SKU ID'),
  query('ownerTeam').optional().isIn(['Marketing', 'Sales', 'Pricing', 'Finance']).withMessage('Invalid owner team'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], getRateCards)

router.post('/', authenticateToken, rateCardValidation, createRateCard)

router.get('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], getRateCard)

router.put('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'JPY']).withMessage('Invalid currency'),
  body('ownerTeam').optional().isIn(['Marketing', 'Sales', 'Pricing', 'Finance']).withMessage('Invalid owner team'),
  body('pricingModel').optional().isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('skuId').optional().isUUID().withMessage('Invalid SKU ID'),
  body('folderId').optional().isUUID().withMessage('Invalid folder ID')
], updateRateCard)

router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], deleteRateCard)

// Duplicate rate card
router.post('/:id/duplicate', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('folderId').optional().isUUID().withMessage('Invalid folder ID')
], duplicateRateCard)

// Share token management
router.post('/:id/share', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], generateShareToken)

router.delete('/:id/share', authenticateToken, [
  param('id').isUUID().withMessage('Invalid rate card ID')
], revokeShareToken)

export default router