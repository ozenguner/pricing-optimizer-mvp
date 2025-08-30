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

// Import rate cards from CSV - POST /api/import/csv
router.post('/csv', upload.single('file'), [
  body('pricingModel').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model'),
  body('skipDuplicates').optional().isIn(['true', 'false']).withMessage('skipDuplicates must be true or false')
], importRateCards)

// Export rate card to CSV - GET /api/export/csv/:id
router.get('/csv/:id', [
  param('id').isUUID().withMessage('Invalid rate card ID')
], exportRateCards)

// Download CSV templates - GET /api/templates/:model
router.get('/:model', [
  param('model').isIn(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']).withMessage('Invalid pricing model')
], downloadTemplate)

export default router