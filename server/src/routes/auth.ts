import { Router } from 'express'
import { body } from 'express-validator'
import { register, login, logout, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'
import { securityLogger, SecurityEventType } from '../middleware/securityLogger.js'

const router = Router()

// Registration endpoint with security logging
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name').trim().isLength({ min: 1, max: 100 })
], 
securityLogger(SecurityEventType.REGISTRATION, (req) => ({ 
  email: req.body?.email,
  nameLength: req.body?.name?.length 
})),
register)

// Login endpoint with security logging
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().notEmpty()
], login) // Security logging is handled in the controller for success/failure differentiation

// Logout endpoint with security logging
router.post('/logout', 
  authenticateToken, 
  securityLogger(SecurityEventType.TOKEN_REFRESH, (req) => ({ 
    action: 'logout' 
  })),
  logout
)

// Profile endpoint (no additional security logging needed for read operations)
router.get('/me', authenticateToken, getProfile)

export default router