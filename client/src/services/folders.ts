import { api } from './api'
import type { Folder } from '../types'

export interface CreateFolderRequest {
  name: string
  parentId?: string
}

export interface UpdateFolderRequest {
  name?: string
  parentId?: string | null
}

export interface FolderResponse {
  message: string
  folder: Folder
}

export interface FoldersResponse {
  folders: Folder[]
}

export interface FolderPathResponse {
  folderId: string
  path: Array<{
    id: string
    name: string
  }>
}

export interface MoveRateCardRequest {
  rateCardId: string
  folderId?: string | null
}

export interface MoveRateCardResponse {
  message: string
  rateCard: {
    id: string
    name: string
    folder?: {
      id: string
      name: string
    }
  }
}

export interface DeleteFolderResponse {
  message: string
  movedRateCards: number
  movedTo: string | null
}

export const folderService = {
  async create(data: CreateFolderRequest): Promise<FolderResponse> {
    const response = await api.post<FolderResponse>('/folders', data)
    return response.data
  },

  async getAll(parentId?: string | null, includeRateCards: boolean = false): Promise<FoldersResponse> {
    const params: any = { includeRateCards: includeRateCards.toString() }
    if (parentId !== undefined) {
      params.parentId = parentId === null ? 'null' : parentId
    }
    const response = await api.get<FoldersResponse>('/folders', { params })
    return response.data
  },

  async getById(id: string): Promise<{ folder: Folder }> {
    const response = await api.get<{ folder: Folder }>(`/folders/${id}`)
    return response.data
  },

  async update(id: string, data: UpdateFolderRequest): Promise<FolderResponse> {
    const response = await api.put<FolderResponse>(`/folders/${id}`, data)
    return response.data
  },

  async delete(id: string, moveRateCardsTo?: string): Promise<DeleteFolderResponse> {
    const params = moveRateCardsTo ? { moveRateCardsTo } : {}
    const response = await api.delete<DeleteFolderResponse>(`/folders/${id}`, { params })
    return response.data
  },

  async getPath(id: string): Promise<FolderPathResponse> {
    const response = await api.get<FolderPathResponse>(`/folders/${id}/path`)
    return response.data
  },

  async moveRateCard(data: MoveRateCardRequest): Promise<MoveRateCardResponse> {
    const response = await api.post<MoveRateCardResponse>('/folders/move-rate-card', data)
    return response.data
  },

  // Utility functions for folder hierarchy management
  buildFolderTree(folders: Folder[]): Folder[] {
    const folderMap = new Map<string, Folder>()
    const rootFolders: Folder[] = []

    // Create map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build the tree structure
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children.push(folderWithChildren)
        } else {
          // Parent not found in current set, treat as root
          rootFolders.push(folderWithChildren)
        }
      } else {
        rootFolders.push(folderWithChildren)
      }
    })

    // Sort folders alphabetically at each level
    const sortFolders = (folders: Folder[]): Folder[] => {
      return folders
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(folder => ({
          ...folder,
          children: sortFolders(folder.children)
        }))
    }

    return sortFolders(rootFolders)
  },

  findFolderInTree(folders: Folder[], targetId: string): Folder | null {
    for (const folder of folders) {
      if (folder.id === targetId) {
        return folder
      }
      if (folder.children.length > 0) {
        const found = this.findFolderInTree(folder.children, targetId)
        if (found) return found
      }
    }
    return null
  },

  getAllDescendantIds(folder: Folder): string[] {
    const descendants: string[] = []
    
    const traverse = (currentFolder: Folder) => {
      currentFolder.children.forEach(child => {
        descendants.push(child.id)
        traverse(child)
      })
    }
    
    traverse(folder)
    return descendants
  },

  canMoveFolder(sourceFolder: Folder, targetParentId: string | null, allFolders: Folder[]): boolean {
    // Can't move folder to itself
    if (sourceFolder.id === targetParentId) {
      return false
    }

    // Can move to root (null parent)
    if (targetParentId === null) {
      return true
    }

    // Can't move folder to one of its descendants
    const descendants = this.getAllDescendantIds(sourceFolder)
    return !descendants.includes(targetParentId)
  },

  validateFolderName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Folder name is required' }
    }
    
    if (name.trim().length > 100) {
      return { isValid: false, error: 'Folder name must be 100 characters or less' }
    }

    // Check for invalid characters (basic validation)
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      return { isValid: false, error: 'Folder name contains invalid characters' }
    }

    return { isValid: true }
  },

  // Helper for breadcrumb generation
  buildBreadcrumbs(path: Array<{ id: string; name: string }>): Array<{ id: string; name: string; isRoot: boolean }> {
    return [
      { id: 'root', name: 'Root', isRoot: true },
      ...path.map((item, index) => ({
        ...item,
        isRoot: false
      }))
    ]
  },

  // Helper for drag and drop validation
  canDropRateCard(targetFolderId: string | null, userFolders: Folder[]): boolean {
    // Can always drop to root
    if (targetFolderId === null) return true

    // Check if target folder exists in user's folders
    const allFolders = this.flattenFolderTree(userFolders)
    return allFolders.some(folder => folder.id === targetFolderId)
  },

  flattenFolderTree(folders: Folder[]): Folder[] {
    const flattened: Folder[] = []
    
    const traverse = (currentFolders: Folder[]) => {
      currentFolders.forEach(folder => {
        flattened.push(folder)
        if (folder.children.length > 0) {
          traverse(folder.children)
        }
      })
    }
    
    traverse(folders)
    return flattened
  }
}