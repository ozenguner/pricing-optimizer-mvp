import { Router } from 'express'
import { body } from 'express-validator'
import { register, login, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 1 })
], register)

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], login)

router.get('/profile', authenticateToken, getProfile)

export default router