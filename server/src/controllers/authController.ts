import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import {
  hashPassword,
  comparePassword,
  generateToken,
  validateEmail,
  validatePassword
} from '../utils/auth.js'
import { logSecurityEvent, SecurityEventType } from '../middleware/securityLogger.js'
import { EmailService, EmailTemplateService } from '../services/email/index.js'
import crypto from 'crypto'

const emailService = new EmailService()
const templateService = new EmailTemplateService(emailService)

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password, name } = req.body

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password validation failed',
        details: passwordValidation.errors
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        verified: true,
        verifiedAt: true
      }
    })

    if (existingUser) {
      // Log registration attempt for existing user
      await logSecurityEvent({
        type: SecurityEventType.REGISTRATION,
        userId: existingUser.id,
        email,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: { 
          reason: 'User already exists',
          existingUserVerified: existingUser.verified
        },
        timestamp: new Date()
      })
      
      // Provide different messages based on verification status for better UX
      if (existingUser.verified) {
        return res.status(400).json({ 
          error: 'An account with this email already exists and is verified. Please try logging in instead.' 
        })
      } else {
        return res.status(400).json({ 
          error: 'An account with this email already exists but is not verified. Please check your email for the verification link or request a new one.' 
        })
      }
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verified: true, // Auto-verify users for now (email verification disabled)
        verifiedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        verified: true
      }
    })

    // Generate JWT token for immediate login
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    // Log successful registration
    await logSecurityEvent({
      type: SecurityEventType.REGISTRATION,
      userId: user.id,
      email: user.email,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                 req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: { 
        emailVerificationSkipped: true,
        reason: 'Email verification disabled'
      },
      timestamp: new Date()
    })

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified
      },
      token,
      requiresVerification: false
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        verified: true,
        verifiedAt: true,
        loginAttempts: true,
        lockedUntil: true
      }
    })

    if (!user) {
      // Log failed login attempt
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        email,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: { reason: 'User not found' },
        timestamp: new Date()
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        userId: user.id,
        email,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: { reason: 'Account locked' },
        timestamp: new Date()
      })
      return res.status(423).json({ 
        error: 'Account temporarily locked due to multiple failed login attempts. Please try again later.' 
      })
    }

    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      // Increment login attempts and potentially lock account
      const newLoginAttempts = (user.loginAttempts || 0) + 1
      const shouldLock = newLoginAttempts >= 5
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newLoginAttempts,
          ...(shouldLock && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
          })
        }
      })

      // Log failed login attempt
      await logSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        userId: user.id,
        email,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: { 
          reason: 'Invalid password',
          loginAttempts: newLoginAttempts,
          accountLocked: shouldLock
        },
        timestamp: new Date()
      })
      
      return res.status(401).json({ 
        error: shouldLock 
          ? 'Account locked due to multiple failed login attempts. Please try again in 30 minutes.'
          : 'Invalid credentials' 
      })
    }

    // Email verification check disabled for now
    // if (!user.verified) {
    //   return res.status(403).json({ 
    //     error: 'Email verification required. Please check your email and verify your account before logging in.',
    //     requiresVerification: true,
    //     email: user.email
    //   })
    // }

    // Reset login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    })

    // Log successful login
    await logSecurityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId: user.id,
      email,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                 req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: { loginMethod: 'email_password' },
      timestamp: new Date()
    })

    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.verified,
        verifiedAt: user.verifiedAt
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    // In a stateless JWT setup, logout is typically handled client-side
    // by removing the token. For enhanced security, you could implement
    // token blacklisting here if needed.
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getProfile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}