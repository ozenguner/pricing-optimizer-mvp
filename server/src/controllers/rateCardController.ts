import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'
import crypto from 'crypto'

export const createRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { 
      name, 
      description, 
      currency = 'USD', 
      ownerTeam = 'Pricing', 
      pricingModel, 
      data, 
      isActive = true, 
      skuId, 
      folderId,
      calculationData
    } = req.body
    const userId = req.user!.id

    // Validate SKU exists if skuId is provided (new hierarchical structure)
    if (skuId) {
      const sku = await prisma.sKU.findUnique({
        where: { id: skuId }
      })
      if (!sku) {
        return res.status(400).json({ error: 'Invalid SKU' })
      }
    }

    // Validate that folder belongs to user if folderId is provided (backward compatibility)
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      })
      if (!folder) {
        return res.status(400).json({ error: 'Invalid folder' })
      }
    }

    const rateCard = await prisma.rateCard.create({
      data: {
        name,
        description,
        currency,
        ownerTeam,
        pricingModel,
        data: JSON.stringify(data),
        isActive,
        skuId,
        folderId,
        userId: skuId ? null : userId, // Only set userId if not using hierarchical structure
        calculationData: calculationData ? JSON.stringify(calculationData) : null,
        isCalculationComplete: calculationData?.isComplete || false,
        calculatedTotalPrice: calculationData?.totalPrice || null,
        priceValidFrom: calculationData?.validFrom ? new Date(calculationData.validFrom) : null,
        priceValidUntil: calculationData?.validUntil ? new Date(calculationData.validUntil) : null,
      },
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    // Parse data back to JSON for response
    const responseRateCard = {
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }

    res.status(201).json({
      message: 'Rate card created successfully',
      rateCard: responseRateCard
    })
  } catch (error) {
    console.error('Create rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getRateCards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { folderId, skuId, ownerTeam, page = '1', limit = '20', search, pricingModel, isActive } = req.query

    const where: any = {
      OR: [
        { userId }, // Legacy rate cards
        { sku: { isNot: null } } // Hierarchical rate cards
      ]
    }
    
    if (folderId) {
      where.folderId = folderId as string
    }
    if (skuId) {
      where.skuId = skuId as string
    }
    if (ownerTeam) {
      where.ownerTeam = ownerTeam as string
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }
    if (pricingModel) {
      where.pricingModel = pricingModel as string
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [rateCards, total] = await Promise.all([
      prisma.rateCard.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true }
          },
          folder: {
            select: { id: true, name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.rateCard.count({ where })
    ])

    // Parse data for all rate cards
    const responseRateCards = rateCards.map(rateCard => ({
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }))

    res.json({ 
      rateCards: responseRateCards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get rate cards error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const rateCard = await prisma.rateCard.findFirst({
      where: { 
        id,
        OR: [
          { userId }, // Legacy rate cards
          { sku: { isNot: null } } // Hierarchical rate cards (accessible to all authenticated users)
        ]
      },
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    // Parse data back to JSON for response
    const responseRateCard = {
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }

    res.json({ rateCard: responseRateCard })
  } catch (error) {
    console.error('Get rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { id } = req.params
    const { name, description, currency, ownerTeam, pricingModel, data, isActive, skuId, folderId, calculationData } = req.body
    const userId = req.user!.id

    // Check if rate card exists and belongs to user
    const existingRateCard = await prisma.rateCard.findFirst({
      where: { id, userId }
    })

    if (!existingRateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    // Validate that folder belongs to user if folderId is provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      })
      if (!folder) {
        return res.status(400).json({ error: 'Invalid folder' })
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (currency !== undefined) updateData.currency = currency
    if (ownerTeam !== undefined) updateData.ownerTeam = ownerTeam
    if (pricingModel !== undefined) updateData.pricingModel = pricingModel
    if (data !== undefined) updateData.data = JSON.stringify(data)
    if (isActive !== undefined) updateData.isActive = isActive
    if (skuId !== undefined) updateData.skuId = skuId
    if (folderId !== undefined) updateData.folderId = folderId
    if (calculationData !== undefined) {
      updateData.calculationData = calculationData ? JSON.stringify(calculationData) : null
      updateData.isCalculationComplete = calculationData?.isComplete || false
      updateData.calculatedTotalPrice = calculationData?.totalPrice || null
      updateData.priceValidFrom = calculationData?.validFrom ? new Date(calculationData.validFrom) : null
      updateData.priceValidUntil = calculationData?.validUntil ? new Date(calculationData.validUntil) : null
    }

    const rateCard = await prisma.rateCard.update({
      where: { id },
      data: updateData,
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    // Parse data back to JSON for response
    const responseRateCard = {
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }

    res.json({
      message: 'Rate card updated successfully',
      rateCard: responseRateCard
    })
  } catch (error) {
    console.error('Update rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if rate card exists and belongs to user
    const existingRateCard = await prisma.rateCard.findFirst({
      where: { id, userId }
    })

    if (!existingRateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    await prisma.rateCard.delete({
      where: { id }
    })

    res.json({ message: 'Rate card deleted successfully' })
  } catch (error) {
    console.error('Delete rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const duplicateRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { name, folderId } = req.body

    // Get the original rate card
    const originalRateCard = await prisma.rateCard.findFirst({
      where: { id, userId }
    })

    if (!originalRateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    // Validate that folder belongs to user if folderId is provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      })
      if (!folder) {
        return res.status(400).json({ error: 'Invalid folder' })
      }
    }

    // Create duplicate with new name or default name
    const duplicateName = name || `${originalRateCard.name} (Copy)`

    const duplicateRateCard = await prisma.rateCard.create({
      data: {
        name: duplicateName,
        description: originalRateCard.description,
        currency: originalRateCard.currency,
        ownerTeam: originalRateCard.ownerTeam,
        pricingModel: originalRateCard.pricingModel,
        data: originalRateCard.data,
        isActive: originalRateCard.isActive,
        skuId: originalRateCard.skuId,
        folderId: folderId || originalRateCard.folderId,
        userId: originalRateCard.skuId ? null : userId
      },
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    // Parse data back to JSON for response
    const responseDuplicateRateCard = {
      ...duplicateRateCard,
      data: JSON.parse(duplicateRateCard.data),
      calculationData: duplicateRateCard.calculationData ? JSON.parse(duplicateRateCard.calculationData) : null
    }

    res.status(201).json({
      message: 'Rate card duplicated successfully',
      rateCard: responseDuplicateRateCard
    })
  } catch (error) {
    console.error('Duplicate rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const generateShareToken = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if rate card exists and belongs to user
    const existingRateCard = await prisma.rateCard.findFirst({
      where: { id, userId }
    })

    if (!existingRateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    const shareToken = crypto.randomUUID()

    const rateCard = await prisma.rateCard.update({
      where: { id },
      data: { shareToken },
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    // Parse data back to JSON for response
    const responseRateCard = {
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }

    res.json({
      message: 'Share token generated successfully',
      rateCard: responseRateCard,
      shareToken
    })
  } catch (error) {
    console.error('Generate share token error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const revokeShareToken = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if rate card exists and belongs to user
    const existingRateCard = await prisma.rateCard.findFirst({
      where: { id, userId }
    })

    if (!existingRateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    const rateCard = await prisma.rateCard.update({
      where: { id },
      data: { shareToken: null },
      include: {
        sku: {
          include: {
            productSuite: {
              include: {
                account: true
              }
            }
          }
        },
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    // Parse data back to JSON for response
    const responseRateCard = {
      ...rateCard,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null
    }

    res.json({
      message: 'Share token revoked successfully',
      rateCard: responseRateCard
    })
  } catch (error) {
    console.error('Revoke share token error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getPublicRateCard = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params

    const rateCard = await prisma.rateCard.findFirst({
      where: { shareToken },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    if (!rateCard || !rateCard.isActive) {
      return res.status(404).json({ error: 'Rate card not found or inactive' })
    }

    // Parse data back to JSON for response
    const responseRateCard = {
      id: rateCard.id,
      name: rateCard.name,
      description: rateCard.description,
      pricingModel: rateCard.pricingModel,
      data: JSON.parse(rateCard.data),
      calculationData: rateCard.calculationData ? JSON.parse(rateCard.calculationData) : null,
      isCalculationComplete: rateCard.isCalculationComplete,
      calculatedTotalPrice: rateCard.calculatedTotalPrice,
      priceValidFrom: rateCard.priceValidFrom,
      priceValidUntil: rateCard.priceValidUntil,
      createdAt: rateCard.createdAt,
      updatedAt: rateCard.updatedAt,
      user: rateCard.user
    }

    res.json({ rateCard: responseRateCard })
  } catch (error) {
    console.error('Get public rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}