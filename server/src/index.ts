import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

import authRoutes from './routes/auth.js'
import rateCardRoutes from './routes/rateCards.js'
import calculatorRoutes from './routes/calculator.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authenticateToken } from './middleware/auth.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

export const prisma = new PrismaClient()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

app.use(helmet())
app.use(limiter)
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

app.use('/api/auth', authRoutes)
app.use('/api/rate-cards', authenticateToken, rateCardRoutes)
app.use('/api/calculator', authenticateToken, calculatorRoutes)

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