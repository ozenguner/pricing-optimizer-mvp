import { Router } from 'express'
import { body, query } from 'express-validator'
import { 
  sendVerificationEmail, 
  verifyEmail, 
  resendVerificationEmail,
  checkVerificationStatus
} from '../controllers/emailVerificationController.js'
import { securityLogger, SecurityEventType } from '../middleware/securityLogger.js'

const router = Router()

// Send verification email (used internally by registration)
router.post('/send', [
  body('userId').isUUID().withMessage('Valid user ID is required')
], 
securityLogger(SecurityEventType.EMAIL_VERIFICATION, (req) => ({ 
  action: 'send_verification_email',
  userId: req.body?.userId 
})),
sendVerificationEmail)

// Verify email with token
router.post('/verify', [
  body('token').isLength({ min: 64, max: 64 }).withMessage('Valid verification token is required')
], 
securityLogger(SecurityEventType.EMAIL_VERIFICATION, (req) => ({ 
  action: 'verify_email',
  tokenProvided: !!req.body?.token 
})),
verifyEmail)

// Resend verification email
router.post('/resend', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required')
], 
securityLogger(SecurityEventType.EMAIL_VERIFICATION, (req) => ({ 
  action: 'resend_verification',
  email: req.body?.email 
})),
resendVerificationEmail)

// Check verification status
router.get('/status', [
  query('email').isEmail().normalizeEmail().withMessage('Valid email address is required')
], checkVerificationStatus)

export default router