import { Router } from 'express'
import { body, param, query } from 'express-validator'
import multer from 'multer'
import {
  downloadTemplate,
  previewImport,
  importRateCards,
  exportRateCards
} from '../controllers/importExportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'))
    }
  }
})

// All routes require authentication
router.use(authenticateToken)

// Download CSV templates
router.get('/templates/:pricingModel', [
  param('pricingModel').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model')
], downloadTemplate)

// Preview import (validate without importing)
router.post('/preview', upload.single('file'), [
  body('pricingModel').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model')
], previewImport)

// Import rate cards from CSV
router.post('/import', upload.single('file'), [
  body('pricingModel').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  body('skipDuplicates').optional().isIn(['true', 'false']).withMessage('skipDuplicates must be true or false')
], importRateCards)

// Export rate cards to CSV
router.get('/export', [
  query('folderId').optional().custom((value) => {
    if (value === 'null' || value === '' || value === null || value === undefined) return true
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true
    throw new Error('Invalid folder ID')
  }),
  query('pricingModel').optional().isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  query('format').optional().isIn(['csv']).withMessage('Only CSV format is supported')
], exportRateCards)

export default router