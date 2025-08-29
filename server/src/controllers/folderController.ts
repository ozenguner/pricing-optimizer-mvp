import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'

export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, parentId } = req.body
    const userId = req.user!.id

    // If parentId is provided, verify it exists and belongs to user
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId }
      })
      if (!parentFolder) {
        return res.status(400).json({ error: 'Parent folder not found' })
      }
    }

    // Check if folder with same name already exists in parent
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name,
        parentId: parentId || null,
        userId
      }
    })

    if (existingFolder) {
      return res.status(400).json({ error: 'Folder with this name already exists in parent location' })
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId,
        userId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true }
        },
        rateCards: {
          select: { id: true, name: true, pricingModel: true, isActive: true }
        }
      }
    })

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    })
  } catch (error) {
    console.error('Create folder error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { parentId, includeRateCards = 'false' } = req.query

    const where: any = { userId }
    if (parentId === 'null' || parentId === '') {
      where.parentId = null
    } else if (parentId) {
      where.parentId = parentId as string
    }

    const include: any = {
      user: {
        select: { id: true, name: true, email: true }
      },
      parent: {
        select: { id: true, name: true }
      },
      children: {
        select: { id: true, name: true, createdAt: true }
      }
    }

    if (includeRateCards === 'true') {
      include.rateCards = {
        select: { 
          id: true, 
          name: true, 
          pricingModel: true, 
          isActive: true, 
          createdAt: true,
          updatedAt: true 
        }
      }
    }

    const folders = await prisma.folder.findMany({
      where,
      include,
      orderBy: { name: 'asc' }
    })

    res.json({ folders })
  } catch (error) {
    console.error('Get folders error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true, createdAt: true },
          orderBy: { name: 'asc' }
        },
        rateCards: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            pricingModel: true, 
            isActive: true, 
            createdAt: true,
            updatedAt: true 
          },
          orderBy: { updatedAt: 'desc' }
        }
      }
    })

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    res.json({ folder })
  } catch (error) {
    console.error('Get folder error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateFolder = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { id } = req.params
    const { name, parentId } = req.body
    const userId = req.user!.id

    // Check if folder exists and belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId }
    })

    if (!existingFolder) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    // If moving to a parent, verify parent exists and belongs to user
    if (parentId !== undefined) {
      if (parentId !== null) {
        const parentFolder = await prisma.folder.findFirst({
          where: { id: parentId, userId }
        })
        if (!parentFolder) {
          return res.status(400).json({ error: 'Parent folder not found' })
        }

        // Prevent circular references (can't move folder into its own subtree)
        if (await isDescendant(id, parentId)) {
          return res.status(400).json({ error: 'Cannot move folder into its own subtree' })
        }
      }
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existingFolder.name) {
      const conflictingFolder = await prisma.folder.findFirst({
        where: {
          name,
          parentId: parentId !== undefined ? parentId : existingFolder.parentId,
          userId,
          NOT: { id }
        }
      })

      if (conflictingFolder) {
        return res.status(400).json({ error: 'Folder with this name already exists in target location' })
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (parentId !== undefined) updateData.parentId = parentId

    const folder = await prisma.folder.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true }
        },
        rateCards: {
          select: { id: true, name: true, pricingModel: true, isActive: true }
        }
      }
    })

    res.json({
      message: 'Folder updated successfully',
      folder
    })
  } catch (error) {
    console.error('Update folder error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { moveRateCardsTo } = req.query
    const userId = req.user!.id

    // Check if folder exists and belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId },
      include: {
        children: true,
        rateCards: true
      }
    })

    if (!existingFolder) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    // Check if folder has children
    if (existingFolder.children.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete folder with subfolders. Move or delete subfolders first.',
        hasChildren: true,
        childrenCount: existingFolder.children.length
      })
    }

    // Handle rate cards in the folder
    if (existingFolder.rateCards.length > 0) {
      if (moveRateCardsTo) {
        // Verify target folder exists and belongs to user
        if (moveRateCardsTo !== 'root') {
          const targetFolder = await prisma.folder.findFirst({
            where: { id: moveRateCardsTo as string, userId }
          })
          if (!targetFolder) {
            return res.status(400).json({ error: 'Target folder not found' })
          }
        }

        // Move rate cards to target folder or root
        await prisma.rateCard.updateMany({
          where: { folderId: id },
          data: { folderId: moveRateCardsTo === 'root' ? null : moveRateCardsTo as string }
        })
      } else {
        return res.status(400).json({ 
          error: 'Folder contains rate cards. Specify where to move them or delete them first.',
          hasRateCards: true,
          rateCardsCount: existingFolder.rateCards.length
        })
      }
    }

    // Delete the folder
    await prisma.folder.delete({
      where: { id }
    })

    res.json({ 
      message: 'Folder deleted successfully',
      movedRateCards: existingFolder.rateCards.length,
      movedTo: moveRateCardsTo || null
    })
  } catch (error) {
    console.error('Delete folder error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getFolderPath = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const folder = await prisma.folder.findFirst({
      where: { id, userId }
    })

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' })
    }

    const path = await buildFolderPath(id, userId)
    
    res.json({ 
      folderId: id,
      path
    })
  } catch (error) {
    console.error('Get folder path error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const moveRateCard = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { rateCardId, folderId } = req.body
    const userId = req.user!.id

    // Verify rate card exists and belongs to user
    const rateCard = await prisma.rateCard.findFirst({
      where: { id: rateCardId, userId }
    })

    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }

    // If moving to a folder, verify it exists and belongs to user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      })
      if (!folder) {
        return res.status(400).json({ error: 'Target folder not found' })
      }
    }

    // Update rate card folder
    const updatedRateCard = await prisma.rateCard.update({
      where: { id: rateCardId },
      data: { folderId: folderId || null },
      include: {
        folder: {
          select: { id: true, name: true }
        }
      }
    })

    res.json({
      message: 'Rate card moved successfully',
      rateCard: {
        id: updatedRateCard.id,
        name: updatedRateCard.name,
        folder: updatedRateCard.folder
      }
    })
  } catch (error) {
    console.error('Move rate card error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to check if a folder is a descendant of another folder
async function isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
  if (ancestorId === descendantId) return true

  const descendant = await prisma.folder.findUnique({
    where: { id: descendantId },
    select: { parentId: true }
  })

  if (!descendant || !descendant.parentId) return false

  return isDescendant(ancestorId, descendant.parentId)
}

// Helper function to build folder path for breadcrumbs
async function buildFolderPath(folderId: string, userId: string): Promise<Array<{id: string, name: string}>> {
  const path: Array<{id: string, name: string}> = []
  let currentId: string | null = folderId

  while (currentId) {
    const folder = await prisma.folder.findFirst({
      where: { id: currentId, userId },
      select: { id: true, name: true, parentId: true }
    })

    if (!folder) break

    path.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parentId
  }

  return path
}