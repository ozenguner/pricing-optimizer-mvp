import { Request, Response } from 'express'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get total rate cards count
    const totalRateCards = await prisma.rateCard.count({
      where: { userId }
    })

    // Get active rate cards count
    const activeRateCards = await prisma.rateCard.count({
      where: { userId, isActive: true }
    })

    // For calculations today, we would need to track calculations in the database
    // For now, returning 0 since we don't have a calculations table
    const calculationsToday = 0

    // Get recent rate cards (last 5 updated)
    const recentRateCards = await prisma.rateCard.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        pricingModel: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })

    res.json({
      totalRateCards,
      activeRateCards,
      calculationsToday,
      recentRateCards
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getDashboardOverview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Get folder statistics
    const totalFolders = await prisma.folder.count({
      where: { userId }
    })

    // Get rate cards by pricing model
    const rateCardsByModel = await prisma.rateCard.groupBy({
      by: ['pricingModel'],
      where: { userId },
      _count: {
        id: true
      }
    })

    // Get rate cards created in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRateCardsCount = await prisma.rateCard.count({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // Get folders with rate card counts
    const foldersWithCounts = await prisma.folder.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            rateCards: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    res.json({
      overview: {
        totalFolders,
        recentRateCardsCount,
        rateCardsByModel: rateCardsByModel.reduce((acc, item) => {
          acc[item.pricingModel] = item._count.id
          return acc
        }, {} as Record<string, number>)
      },
      folders: foldersWithCounts.map(folder => ({
        id: folder.id,
        name: folder.name,
        rateCardCount: folder._count.rateCards
      }))
    })
  } catch (error) {
    console.error('Get dashboard overview error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}