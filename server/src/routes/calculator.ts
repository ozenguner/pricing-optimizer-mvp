import { Router } from 'express'
import { body, param } from 'express-validator'
import {
  calculatePricing,
  bulkCalculatePricing,
  calculatePublicPricing,
  validatePricingModel
} from '../controllers/calculatorController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Validation middleware
const calculateValidation = [
  body('rateCardId').isUUID().withMessage('Invalid rate card ID'),
  body('quantity').isNumeric().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('baseCost').optional().isNumeric().isFloat({ gte: 0 }).withMessage('Base cost must be a non-negative number'),
  body('billingPeriod').optional().isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),
  body('parameters').optional().isObject().withMessage('Parameters must be an object')
]

const bulkCalculateValidation = [
  body('calculations').isArray({ min: 1, max: 50 }).withMessage('Calculations must be an array with 1-50 items'),
  body('calculations.*.rateCardId').isUUID().withMessage('Invalid rate card ID'),
  body('calculations.*.quantity').isNumeric().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('calculations.*.baseCost').optional().isNumeric().isFloat({ gte: 0 }).withMessage('Base cost must be a non-negative number'),
  body('calculations.*.billingPeriod').optional().isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),
  body('calculations.*.parameters').optional().isObject().withMessage('Parameters must be an object'),
  body('calculations.*.label').optional().isString().isLength({ max: 100 }).withMessage('Label must be a string with max 100 characters')
]

const publicCalculateValidation = [
  param('shareToken').isUUID().withMessage('Invalid share token'),
  body('quantity').isNumeric().isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('baseCost').optional().isNumeric().isFloat({ gte: 0 }).withMessage('Base cost must be a non-negative number'),
  body('billingPeriod').optional().isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),
  body('parameters').optional().isObject().withMessage('Parameters must be an object')
]

const validateModelValidation = [
  body('pricingModel').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  body('data').isObject().withMessage('Data must be an object')
]

// Protected routes (require authentication)
router.post('/calculate', authenticateToken, calculateValidation, calculatePricing)
router.post('/bulk-calculate', authenticateToken, bulkCalculateValidation, bulkCalculatePricing)
router.post('/validate', authenticateToken, validateModelValidation, validatePricingModel)

// Public routes (no authentication required)
router.post('/shared/:shareToken/calculate', publicCalculateValidation, calculatePublicPricing)

export default router