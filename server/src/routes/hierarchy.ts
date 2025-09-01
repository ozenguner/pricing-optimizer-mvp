import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  createAccount,
  getAccounts,
  getAccount,
  createProductSuite,
  getProductSuites,
  getProductSuite,
  createSKU,
  getSKUs,
  getSKU,
  getAccountsHierarchy
} from '../controllers/hierarchyController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Account routes
// Full hierarchy for dropdown population (must come before parameterized routes)
router.get('/accounts/hierarchy', authenticateToken, [
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters'),
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500')
], getAccountsHierarchy)

router.get('/accounts', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters')
], getAccounts)

router.post('/accounts', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
], createAccount)

router.get('/accounts/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid account ID')
], getAccount)

// Product Suite routes
router.get('/product-suites', authenticateToken, [
  query('accountId').optional().isUUID().withMessage('Invalid account ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters')
], getProductSuites)

router.post('/product-suites', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('accountId').isUUID().withMessage('Invalid account ID')
], createProductSuite)

router.get('/product-suites/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid product suite ID')
], getProductSuite)

// SKU routes
router.get('/skus', authenticateToken, [
  query('productSuiteId').optional().isUUID().withMessage('Invalid product suite ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters')
], getSKUs)

router.post('/skus', authenticateToken, [
  body('code').trim().isLength({ min: 1, max: 50 }).withMessage('Code must be 1-50 characters'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('productSuiteId').isUUID().withMessage('Invalid product suite ID')
], createSKU)

router.get('/skus/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid SKU ID')
], getSKU)


export default router