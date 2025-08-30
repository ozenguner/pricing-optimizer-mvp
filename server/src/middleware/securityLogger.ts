import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Security event types for monitoring and logging
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT'
}

/**
 * Security event interface for structured logging
 */
export interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  email?: string
  ipAddress: string
  userAgent: string
  details?: Record<string, any>
  timestamp: Date
}

/**
 * Extracts client IP address from request, handling proxies and load balancers
 * 
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

/**
 * Logs security events to database and console for monitoring
 * 
 * Business Logic:
 * - Records security-relevant events for audit trails
 * - Helps identify patterns of suspicious activity
 * - Enables compliance with security logging requirements
 * - Provides data for security monitoring and alerting
 * 
 * @param event - Security event to log
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Log to console for immediate visibility (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Security Event: ${event.type}`, {
        userId: event.userId,
        email: event.email,
        ip: event.ipAddress,
        timestamp: event.timestamp.toISOString(),
        details: event.details
      })
    }

    // Store in database for audit trail and analysis
    await prisma.securityLog.create({
      data: {
        eventType: event.type,
        userId: event.userId || null,
        email: event.email || null,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details ? JSON.stringify(event.details) : null,
        timestamp: event.timestamp
      }
    })

    // Check for suspicious patterns and alert if needed
    await checkSuspiciousActivity(event)
  } catch (error) {
    // Don't let logging errors affect main application flow
    console.error('Failed to log security event:', error)
  }
}

/**
 * Middleware to automatically log security events from HTTP requests
 * 
 * @param eventType - Type of security event
 * @param extractDetails - Function to extract additional details from request
 * @returns Express middleware function
 */
export function securityLogger(
  eventType: SecurityEventType,
  extractDetails?: (req: Request, res: Response) => Record<string, any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const securityEvent: SecurityEvent = {
        type: eventType,
        userId: (req as any).user?.id,
        email: (req as any).user?.email || req.body?.email,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent') || 'unknown',
        details: extractDetails ? extractDetails(req, res) : undefined,
        timestamp: new Date()
      }

      await logSecurityEvent(securityEvent)
    } catch (error) {
      // Don't block request processing due to logging errors
      console.error('Security logging middleware error:', error)
    }

    next()
  }
}

/**
 * Checks for suspicious activity patterns and triggers alerts
 * 
 * @param event - Current security event
 */
async function checkSuspiciousActivity(event: SecurityEvent): Promise<void> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  try {
    // Check for multiple failed login attempts from same IP
    if (event.type === SecurityEventType.LOGIN_FAILURE) {
      const recentFailures = await prisma.securityLog.count({
        where: {
          eventType: SecurityEventType.LOGIN_FAILURE,
          ipAddress: event.ipAddress,
          timestamp: {
            gte: oneHourAgo
          }
        }
      })

      if (recentFailures >= 10) {
        await logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: {
            reason: 'Multiple failed login attempts from same IP',
            failureCount: recentFailures,
            timeWindow: '1 hour'
          },
          timestamp: now
        })

        // In production, you might want to trigger alerts here
        console.warn(`🚨 SUSPICIOUS ACTIVITY: ${recentFailures} failed login attempts from IP ${event.ipAddress}`)
      }
    }

    // Check for rapid-fire requests from same IP
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      const recentRateLimits = await prisma.securityLog.count({
        where: {
          eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
          ipAddress: event.ipAddress,
          timestamp: {
            gte: oneHourAgo
          }
        }
      })

      if (recentRateLimits >= 5) {
        await logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: {
            reason: 'Repeated rate limit violations',
            violationCount: recentRateLimits,
            timeWindow: '1 hour'
          },
          timestamp: now
        })

        console.warn(`🚨 SUSPICIOUS ACTIVITY: Repeated rate limit violations from IP ${event.ipAddress}`)
      }
    }
  } catch (error) {
    console.error('Error checking suspicious activity:', error)
  }
}

/**
 * Middleware to log rate limit exceeded events
 */
export function rateLimitLogger(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send

  res.send = function(data) {
    if (res.statusCode === 429) {
      // Rate limit was exceeded, log the event
      logSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent') || 'unknown',
        details: {
          endpoint: req.path,
          method: req.method
        },
        timestamp: new Date()
      }).catch(console.error)
    }
    return originalSend.call(this, data)
  }

  next()
}

/**
 * Gets security event statistics for monitoring dashboard
 * 
 * @param hours - Number of hours to look back (default: 24)
 * @returns Security event statistics
 */
export async function getSecurityStats(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const stats = await prisma.securityLog.groupBy({
    by: ['eventType'],
    where: {
      timestamp: {
        gte: since
      }
    },
    _count: {
      eventType: true
    }
  })

  return {
    timeWindow: `${hours} hours`,
    events: stats.reduce((acc, stat) => {
      acc[stat.eventType] = stat._count.eventType
      return acc
    }, {} as Record<string, number>),
    totalEvents: stats.reduce((sum, stat) => sum + stat._count.eventType, 0)
  }
}