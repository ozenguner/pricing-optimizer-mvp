import { useState, useEffect, useCallback } from 'react'
import { folderService } from '../services/folders'
import type { Folder } from '../types'

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await folderService.getAll(undefined, true)
      const tree = folderService.buildFolderTree(response.folders)
      setFolders(tree)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch folders')
    } finally {
      setLoading(false)
    }
  }, [])

  const createFolder = useCallback(async (name: string, parentId?: string) => {
    try {
      await folderService.create({ name, parentId })
      await fetchFolders() // Refresh the list
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create folder')
    }
  }, [fetchFolders])

  const updateFolder = useCallback(async (id: string, name: string, parentId?: string | null) => {
    try {
      await folderService.update(id, { name, parentId })
      await fetchFolders() // Refresh the list
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update folder')
    }
  }, [fetchFolders])

  const deleteFolder = useCallback(async (id: string, moveRateCardsTo?: string) => {
    try {
      await folderService.delete(id, moveRateCardsTo)
      await fetchFolders() // Refresh the list
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to delete folder')
    }
  }, [fetchFolders])

  const moveRateCard = useCallback(async (rateCardId: string, folderId: string | null) => {
    try {
      await folderService.moveRateCard({ rateCardId, folderId })
      await fetchFolders() // Refresh to get updated rate card counts
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to move rate card')
    }
  }, [fetchFolders])

  // Helper to get flat list of folders for dropdowns
  const getFlatFolders = useCallback(() => {
    return folderService.flattenFolderTree(folders)
  }, [folders])

  // Helper to find a folder by ID
  const findFolder = useCallback((id: string) => {
    return folderService.findFolderInTree(folders, id)
  }, [folders])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  return {
    folders,
    loading,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveRateCard,
    getFlatFolders,
    findFolder
  }
}