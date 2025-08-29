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

    const { name, description, pricingModel, data, isActive = true, folderId } = req.body
    const userId = req.user!.id

    // Validate that folder belongs to user if folderId is provided
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
        pricingModel,
        data: JSON.stringify(data),
        isActive,
        folderId,
        userId
      },
      include: {
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
      data: JSON.parse(rateCard.data)
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
    const { folderId } = req.query

    const where: any = { userId }
    if (folderId) {
      where.folderId = folderId as string
    }

    const rateCards = await prisma.rateCard.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Parse data for all rate cards
    const responseRateCards = rateCards.map(rateCard => ({
      ...rateCard,
      data: JSON.parse(rateCard.data)
    }))

    res.json({ rateCards: responseRateCards })
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
      where: { id, userId },
      include: {
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
      data: JSON.parse(rateCard.data)
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
    const { name, description, pricingModel, data, isActive, folderId } = req.body
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
    if (pricingModel !== undefined) updateData.pricingModel = pricingModel
    if (data !== undefined) updateData.data = JSON.stringify(data)
    if (isActive !== undefined) updateData.isActive = isActive
    if (folderId !== undefined) updateData.folderId = folderId

    const rateCard = await prisma.rateCard.update({
      where: { id },
      data: updateData,
      include: {
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
      data: JSON.parse(rateCard.data)
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
      data: JSON.parse(rateCard.data)
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
      data: JSON.parse(rateCard.data)
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