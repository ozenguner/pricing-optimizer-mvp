import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

import authRoutes from './routes/auth.js'
import rateCardRoutes from './routes/rateCards.js'
import calculatorRoutes from './routes/calculator.js'
import folderRoutes from './routes/folders.js'
import importExportRoutes from './routes/importExport.js'
import publicRoutes from './routes/public.js'
import dashboardRoutes from './routes/dashboard.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'
import { rateLimitLogger } from './middleware/securityLogger.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

export const prisma = new PrismaClient()

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 minutes
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 authentication attempts per IP per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
})

// Moderate rate limiter for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 requests per IP per 10 minutes
  message: {
    error: 'Too many requests for sensitive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

app.use(helmet({
  // Enhanced security headers
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// Apply security logging for rate limits
app.use(rateLimitLogger)

// Apply general rate limiting to all requests
app.use(generalLimiter)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Apply strict rate limiting to authentication endpoints
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/rate-cards', authenticateToken, rateCardRoutes)
app.use('/api/folders', authenticateToken, folderRoutes)
// Apply moderate rate limiting to sensitive operations
app.use('/api/import', authenticateToken, sensitiveOperationsLimiter, importExportRoutes)
app.use('/api/export', authenticateToken, sensitiveOperationsLimiter, importExportRoutes)
app.use('/api/templates', authenticateToken, importExportRoutes)
app.use('/api/calculator', authenticateToken, calculatorRoutes)
app.use('/api/dashboard', authenticateToken, dashboardRoutes)

// Public share route (no authentication required)
app.use('/api/share', publicRoutes)

app.use(errorHandler)

async function startServer() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

startServer()