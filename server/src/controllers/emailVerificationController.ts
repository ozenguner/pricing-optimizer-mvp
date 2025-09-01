import { Request, Response } from 'express'
import { prisma } from '../index.js'
import { EmailService, EmailTemplateService } from '../services/email/index.js'
import { logSecurityEvent, SecurityEventType } from '../middleware/securityLogger.js'
import crypto from 'crypto'

const emailService = new EmailService()
const templateService = new EmailTemplateService(emailService)

export const sendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.verified) {
      // Log attempt to send verification email to already verified user
      await logSecurityEvent({
        type: SecurityEventType.EMAIL_VERIFICATION,
        userId: user.id,
        email: user.email,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: { 
          reason: 'Attempt to send verification email to already verified user',
          verifiedAt: user.verifiedAt
        },
        timestamp: new Date()
      })
      
      return res.status(400).json({ error: 'Email already verified' })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'email_verification'
      }
    })

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        type: 'email_verification',
        expiresAt
      }
    })

    // Send verification email
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email/complete?token=${token}`

    const emailResult = await templateService.sendVerificationEmail(
      { email: user.email, name: user.name },
      {
        userEmail: user.email,
        userName: user.name,
        verificationUrl,
        verificationToken: token,
        expiresAt,
        baseUrl,
        supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@ratecardlab.com'
      }
    )

    // Log the verification email send attempt
    await logSecurityEvent({
      type: SecurityEventType.EMAIL_VERIFICATION,
      userId: user.id,
      email: user.email,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                 req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: { 
        emailSent: emailResult.success,
        provider: emailResult.provider,
        tokenExpiry: expiresAt.toISOString()
      },
      timestamp: new Date()
    })

    if (emailResult.success) {
      res.json({
        message: 'Verification email sent successfully',
        expiresAt
      })
    } else {
      console.error('Failed to send verification email:', emailResult.error)
      res.status(500).json({ 
        error: 'Failed to send verification email. Please try again later.' 
      })
    }

  } catch (error) {
    console.error('Send verification email error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid verification token' })
    }

    if (verificationToken.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' })
    }

    if (verificationToken.usedAt) {
      return res.status(400).json({ error: 'Verification token already used' })
    }

    if (new Date() > verificationToken.expiresAt) {
      return res.status(400).json({ error: 'Verification token expired' })
    }

    // Mark token as used
    await prisma.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() }
    })

    // Update user verification status
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    })

    // Send welcome email
    const welcomeEmailResult = await templateService.sendWelcomeEmail(
      { email: verificationToken.user.email, name: verificationToken.user.name },
      {
        userEmail: verificationToken.user.email,
        userName: verificationToken.user.name,
        dashboardUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/dashboard`,
        createdAt: verificationToken.user.createdAt,
        verifiedAt: new Date(),
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@ratecardlab.com'
      }
    )

    // Log successful email verification
    await logSecurityEvent({
      type: SecurityEventType.EMAIL_VERIFICATION,
      userId: verificationToken.userId,
      email: verificationToken.user.email,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                 req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: { 
        verified: true,
        welcomeEmailSent: welcomeEmailResult.success
      },
      timestamp: new Date()
    })

    res.json({
      message: 'Email verified successfully',
      user: {
        id: verificationToken.user.id,
        email: verificationToken.user.email,
        name: verificationToken.user.name,
        verified: true,
        verifiedAt: new Date()
      }
    })

  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true
      }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with this email exists and is unverified, a verification email has been sent.'
      })
    }

    if (user.verified) {
      return res.status(400).json({ error: 'Email already verified' })
    }

    // Check for recent verification tokens to prevent spam
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'email_verification',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      }
    })

    if (recentToken) {
      return res.status(429).json({ 
        error: 'Please wait at least 5 minutes before requesting another verification email' 
      })
    }

    // Use the sendVerificationEmail logic
    req.body.userId = user.id
    return await sendVerificationEmail(req, res)

  } catch (error) {
    console.error('Resend verification email error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const checkVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.query

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        verified: true,
        verifiedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      verified: user.verified,
      verifiedAt: user.verifiedAt,
      email: user.email
    })

  } catch (error) {
    console.error('Check verification status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}