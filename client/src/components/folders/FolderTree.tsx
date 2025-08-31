interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void
}

export const FolderTree: React.FC<FolderTreeProps> = ({ onFolderSelect }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Folders</h3>
      <div className="space-y-1">
        <button
          onClick={() => onFolderSelect?.(null)}
          className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          All Rate Cards
        </button>
        <div className="text-sm text-gray-500 px-2 py-2">
          Folder management coming soon...
        </div>
      </div>
    </div>
  )
}