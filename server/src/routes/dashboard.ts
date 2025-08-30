import { Router } from 'express'
import { getDashboardStats, getDashboardOverview } from '../controllers/dashboardController.js'

const router = Router()

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats)

// GET /api/dashboard/overview - Get detailed dashboard overview
router.get('/overview', getDashboardOverview)

export default router