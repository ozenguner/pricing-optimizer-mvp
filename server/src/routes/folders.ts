import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createFolder,
  getFolders,
  getFolder,
  updateFolder,
  deleteFolder,
  getFolderPath,
  moveRateCard
} from '../controllers/folderController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

const folderValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('parentId').optional().isUUID().withMessage('Invalid parent folder ID')
]

const updateFolderValidation = [
  param('id').isUUID().withMessage('Invalid folder ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('parentId').optional().custom((value) => {
    // Allow null or valid UUID
    if (value === null) return true
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true
    throw new Error('Invalid parent folder ID')
  })
]

const moveRateCardValidation = [
  body('rateCardId').isUUID().withMessage('Invalid rate card ID'),
  body('folderId').optional().custom((value) => {
    // Allow null or valid UUID
    if (value === null) return true
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true
    throw new Error('Invalid folder ID')
  })
]

// All folder routes require authentication
router.use(authenticateToken)

// Folder CRUD operations
router.post('/', folderValidation, createFolder)

router.get('/', [
  query('parentId').optional().custom((value) => {
    // Allow 'null', empty string, or valid UUID
    if (value === 'null' || value === '' || value === null || value === undefined) return true
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true
    throw new Error('Invalid parent folder ID')
  }),
  query('includeRateCards').optional().isIn(['true', 'false']).withMessage('includeRateCards must be true or false')
], getFolders)

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid folder ID')
], getFolder)

router.put('/:id', updateFolderValidation, updateFolder)

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid folder ID'),
  query('moveRateCardsTo').optional().custom((value) => {
    // Allow 'root' or valid UUID
    if (value === 'root') return true
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true
    throw new Error('moveRateCardsTo must be "root" or a valid folder ID')
  })
], deleteFolder)

// Utility operations
router.get('/:id/path', [
  param('id').isUUID().withMessage('Invalid folder ID')
], getFolderPath)

router.post('/move-rate-card', moveRateCardValidation, moveRateCard)

export default router