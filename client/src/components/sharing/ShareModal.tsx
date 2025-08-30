import React, { useState, useCallback } from 'react'
import { 
  LinkIcon, 
  ClipboardDocumentIcon, 
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import { rateCardService } from '../../services/rateCards'
import { extractErrorMessage } from '../../utils/errorHandling'
import type { RateCard } from '../../types'

/**
 * Props interface for ShareModal component
 */
interface ShareModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to close the modal */
  onClose: () => void
  /** Rate card to share */
  rateCard: RateCard
  /** Callback when share token is generated/revoked */
  onShareTokenUpdate?: (rateCard: RateCard) => void
}

/**
 * Share Modal Component
 * 
 * Business Logic:
 * - Generates public links for rate card sharing
 * - Allows copying links to clipboard
 * - Provides share token management (generate/revoke)
 * - Shows preview of what public users will see
 * - Handles share analytics and tracking
 * 
 * Security Features:
 * - Uses UUID-based tokens for security
 * - Share tokens can be revoked at any time
 * - Public access doesn't expose sensitive user data
 * - Audit logging of share operations
 * 
 * User Experience:
 * - One-click link copying with visual feedback
 * - Clear indication of sharing status
 * - Easy toggle between private/public states
 */
export const ShareModal = React.memo<ShareModalProps>(({
  isOpen,
  onClose,
  rateCard,
  onShareTokenUpdate
}) => {
  const [isGeneratingShareToken, setIsGeneratingShareToken] = useState(false)
  const [isRevokingShareToken, setIsRevokingShareToken] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * Generates a new share token for the rate card
   * Creates public link that allows anonymous access to rate card data
   */
  const handleGenerateShareToken = useCallback(async () => {
    setIsGeneratingShareToken(true)
    setError(null)

    try {
      const shareToken = await rateCardService.generateShareToken(rateCard.id)
      const updatedRateCard = { ...rateCard, shareToken }
      
      if (onShareTokenUpdate) {
        onShareTokenUpdate(updatedRateCard)
      }
    } catch (error) {
      setError(extractErrorMessage(error) || 'Failed to generate share link')
    } finally {
      setIsGeneratingShareToken(false)
    }
  }, [rateCard, onShareTokenUpdate])

  /**
   * Revokes the current share token
   * Makes the rate card private again by removing public access
   */
  const handleRevokeShareToken = useCallback(async () => {
    setIsRevokingShareToken(true)
    setError(null)

    try {
      await rateCardService.revokeShareToken(rateCard.id)
      const updatedRateCard = { ...rateCard, shareToken: null }
      
      if (onShareTokenUpdate) {
        onShareTokenUpdate(updatedRateCard)
      }
    } catch (error) {
      setError(extractErrorMessage(error) || 'Failed to revoke share link')
    } finally {
      setIsRevokingShareToken(false)
    }
  }, [rateCard, onShareTokenUpdate])

  /**
   * Copies the public share link to clipboard
   * Provides visual feedback to confirm successful copy
   */
  const handleCopyLink = useCallback(async () => {
    if (!rateCard.shareToken) return

    const shareUrl = `${window.location.origin}/shared/${rateCard.shareToken}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyFeedback('Link copied!')
      setTimeout(() => setCopyFeedback(''), 2000)
    } catch (error) {
      setCopyFeedback('Failed to copy')
      setTimeout(() => setCopyFeedback(''), 2000)
    }
  }, [rateCard.shareToken])

  /**
   * Opens the public share link in a new tab
   * Allows user to preview what others will see
   */
  const handlePreviewLink = useCallback(() => {
    if (!rateCard.shareToken) return
    const shareUrl = `${window.location.origin}/shared/${rateCard.shareToken}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }, [rateCard.shareToken])

  if (!isOpen) return null

  const shareUrl = rateCard.shareToken 
    ? `${window.location.origin}/shared/${rateCard.shareToken}`
    : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Modal backdrop */}
        <div 
          className="fixed inset-0 bg-secondary-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal container */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Modal header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-secondary-900">
                Share Rate Card
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Rate card info */}
          <div className="bg-secondary-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-secondary-900 mb-1">
              {rateCard.name}
            </h4>
            <p className="text-sm text-secondary-600">
              {rateCard.description || 'No description provided'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500">
              <span className="capitalize">{rateCard.pricingModel} pricing</span>
              {rateCard.isActive ? (
                <span className="text-success-600">Active</span>
              ) : (
                <span className="text-error-600">Inactive</span>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="alert-error mb-4">
              {error}
            </div>
          )}

          {/* Share status and controls */}
          <div className="space-y-4">
            {rateCard.shareToken ? (
              <>
                {/* Active share state */}
                <div className="flex items-center gap-2 text-success-600 mb-4">
                  <EyeIcon className="h-5 w-5" />
                  <span className="font-medium">This rate card is public</span>
                </div>

                {/* Share link display and controls */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-secondary-700">
                    Public Link
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl || ''}
                      readOnly
                      className="form-input flex-1 text-sm bg-secondary-50"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="btn-secondary p-2"
                      title="Copy link to clipboard"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handlePreviewLink}
                      className="btn-secondary p-2"
                      title="Preview in new tab"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {copyFeedback && (
                    <p className="text-sm text-success-600">
                      {copyFeedback}
                    </p>
                  )}
                </div>

                {/* Usage info */}
                <div className="bg-primary-50 rounded-lg p-3">
                  <p className="text-sm text-primary-700">
                    <strong>Anyone with this link</strong> can view this rate card and use it for price calculations. 
                    They cannot edit or delete it.
                  </p>
                </div>

                {/* Revoke button */}
                <button
                  onClick={handleRevokeShareToken}
                  disabled={isRevokingShareToken}
                  className="w-full btn-secondary text-error-600 hover:bg-error-50 disabled:opacity-50"
                >
                  {isRevokingShareToken ? (
                    <>
                      <div className="loading-spinner-sm mr-2" />
                      Revoking Access...
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="h-4 w-4 mr-2" />
                      Make Private
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Private state */}
                <div className="flex items-center gap-2 text-secondary-500 mb-4">
                  <EyeSlashIcon className="h-5 w-5" />
                  <span className="font-medium">This rate card is private</span>
                </div>

                <div className="bg-secondary-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-secondary-600">
                    Generate a public link to share this rate card with others. 
                    They'll be able to view the pricing details and calculate costs, 
                    but cannot modify the rate card.
                  </p>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerateShareToken}
                  disabled={isGeneratingShareToken}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {isGeneratingShareToken ? (
                    <>
                      <div className="loading-spinner-sm mr-2" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Generate Public Link
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Modal footer */}
          <div className="mt-6 pt-4 border-t border-secondary-200">
            <button
              onClick={onClose}
              className="w-full btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ShareModal.displayName = 'ShareModal'