import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { hierarchyService } from '../../services/hierarchy'
import { authService } from '../../services/auth'
import { useRateCardWizard } from '../../contexts/RateCardWizardContext'
import type { Account, ProductSuite, SKU, Currency, OwnerTeam } from '../../types'

const cardDetailsSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100, 'Card name must be less than 100 characters'),
  skuId: z.string().optional(),
  ownerTeam: z.enum(['Marketing', 'Sales', 'Pricing', 'Finance']),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'JPY']),
  sharingPermissions: z.object({
    type: z.enum(['internal', 'external']),
    permissions: z.object({
      level: z.enum(['view', 'edit', 'admin']),
      allowSharing: z.boolean().optional(),
      allowDownload: z.boolean().optional()
    })
  })
})

type FormData = z.infer<typeof cardDetailsSchema>

interface ProductOption {
  value: string
  label: string
  sku: SKU
}

export default function CardDetailsStep({ onCancel }: { onCancel: () => void }) {
  const { state, actions } = useRateCardWizard()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(cardDetailsSchema),
    mode: 'onChange',
    defaultValues: {
      name: state.cardName,
      skuId: state.skuId || '',
      ownerTeam: state.ownerTeam,
      currency: state.currency,
      sharingPermissions: state.permissions
    }
  })

  const watchedSharingType = watch('sharingPermissions.type')
  const selectedSkuId = watch('skuId')

  // Extract user domain from current user's email
  const currentUser = authService.getStoredUser()
  const userDomain = currentUser?.email ? currentUser.email.split('@')[1] : ''

  // Load all hierarchy data and build product options
  useEffect(() => {
    const loadHierarchyData = async () => {
      try {
        setLoading(true)
        const accountsResponse = await hierarchyService.getAccounts({ limit: 100 })
        const accountsData = accountsResponse.accounts || []
        setAccounts(accountsData)

        // Build flattened product options from all accounts
        const options: ProductOption[] = []
        
        for (const account of accountsData) {
          const productSuitesResponse = await hierarchyService.getProductSuites({ 
            accountId: account.id, 
            limit: 100 
          })
          const productSuites = productSuitesResponse.productSuites || []

          for (const productSuite of productSuites) {
            const skusResponse = await hierarchyService.getSKUs({ 
              productSuiteId: productSuite.id, 
              limit: 100 
            })
            const skus = skusResponse.skus || []

            for (const sku of skus) {
              options.push({
                value: sku.id,
                label: `${account.name} > ${productSuite.name} > ${sku.code} - ${sku.name}`,
                sku: {
                  ...sku,
                  productSuite: {
                    ...productSuite,
                    account
                  }
                }
              })
            }
          }
        }

        setProductOptions(options)
      } catch (err) {
        console.error('Failed to load hierarchy data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadHierarchyData()
  }, [])

  // Filter product options based on search term
  const filteredOptions = productOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.sku.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected product label
  const getSelectedProductLabel = () => {
    if (!selectedSkuId) return ''
    const option = productOptions.find(opt => opt.value === selectedSkuId)
    return option ? option.label : ''
  }

  const onSubmit = (formData: FormData) => {
    // Clear validation error state on successful submission
    setShowValidationErrors(false)
    setIsNavigating(true)
    
    // Update context state
    actions.setCardName(formData.name)
    actions.setSkuId(formData.skuId || '')
    actions.setOwnerTeam(formData.ownerTeam)
    actions.setCurrency(formData.currency)
    actions.setPermissions(formData.sharingPermissions)
    
    // Validate and proceed to next step
    actions.validateStep(1, true)
    actions.nextStep()
    
    // Reset navigation state
    setTimeout(() => setIsNavigating(false), 100)
  }

  const handleNextClick = () => {
    setShowValidationErrors(true)
    // Trigger form submission which will show validation errors if any
    handleSubmit(onSubmit)()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Card Details</h2>
        <p className="text-sm text-gray-600 mb-6">
          Provide basic information about your rate card and link it to a product if desired.
        </p>
      </div>

      {/* Validation Error Summary */}
      {showValidationErrors && Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.name && <li>Card name is required</li>}
                  {errors.ownerTeam && <li>Owner team selection is required</li>}
                  {errors.currency && <li>Currency selection is required</li>}
                  {errors.sharingPermissions && <li>Sharing permissions are required</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Card Name */}
        <div>
          <label className="form-label">
            Card Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            className="form-input"
            placeholder="Enter rate card name"
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Product Information */}
        <div>
          <label className="form-label">Product Information</label>
          <p className="text-sm text-gray-600 mb-2">
            Link this rate card to a specific product in your hierarchy (optional)
          </p>
          
          {loading ? (
            <div className="form-input flex items-center justify-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
              <span>Loading products...</span>
            </div>
          ) : productOptions.length === 0 ? (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No products available. Please create a Product Suite first.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="btn-secondary opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                Create Product Suite
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                className="form-input cursor-pointer flex items-center justify-between"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={selectedSkuId ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedSkuId ? getSelectedProductLabel() : 'Select a product (optional)'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                  <div className="p-3 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100"
                      onClick={() => {
                        setValue('skuId', '')
                        setIsDropdownOpen(false)
                        setSearchTerm('')
                      }}
                    >
                      <span className="text-gray-500">No product (standalone rate card)</span>
                    </button>
                    {filteredOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100"
                        onClick={() => {
                          setValue('skuId', option.value)
                          setIsDropdownOpen(false)
                          setSearchTerm('')
                        }}
                      >
                        <div className="font-medium text-gray-900">{option.sku.code} - {option.sku.name}</div>
                        <div className="text-xs text-gray-500">
                          {option.sku.productSuite?.account?.name} {'>'} {option.sku.productSuite?.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Owner Team */}
        <div>
          <label className="form-label">
            Owner Team <span className="text-red-500">*</span>
          </label>
          {/* TODO: Replace with user team membership when governance implemented */}
          <select {...register('ownerTeam')} className="form-input">
            <option value="Pricing">Pricing</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Finance">Finance</option>
          </select>
          {errors.ownerTeam && (
            <p className="mt-1 text-sm text-red-600">{errors.ownerTeam.message}</p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label className="form-label">
            Currency <span className="text-red-500">*</span>
          </label>
          <select {...register('currency')} className="form-input">
            <option value="USD">$ USD - US Dollar</option>
            <option value="EUR">€ EUR - Euro</option>
            <option value="GBP">£ GBP - British Pound</option>
            <option value="CAD">$ CAD - Canadian Dollar</option>
            <option value="JPY">¥ JPY - Japanese Yen</option>
          </select>
          {errors.currency && (
            <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
          )}
        </div>

        {/* Permissions */}
        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-900 mb-3">Permissions</h3>
          <p className="text-sm text-gray-600 mb-4">Control who can access this rate card</p>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">Sharing Type</label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    {...register('sharingPermissions.type')}
                    type="radio"
                    value="internal"
                    className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Internal</span>
                    <p className="text-xs text-gray-600">Only people in your organization can access this rate card</p>
                  </div>
                </label>
                <label className="flex items-start space-x-3">
                  <input
                    {...register('sharingPermissions.type')}
                    type="radio"
                    value="external"
                    className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">External</span>
                    <p className="text-xs text-gray-600">Anyone with the link can access this rate card</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="form-label">Permission Level</label>
              <select {...register('sharingPermissions.permissions.level')} className="form-input">
                <option value="view">View only - Can view and use calculator</option>
                <option value="edit">Edit - Can modify rate card details</option>
                <option value="admin">Admin - Full control including sharing permissions</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  {...register('sharingPermissions.permissions.allowSharing')}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Allow others to reshare this rate card</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  {...register('sharingPermissions.permissions.allowDownload')}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Allow download and export</span>
              </label>
            </div>

            {watchedSharingType === 'internal' && (
              <div>
                <label className="form-label">Organization Domain</label>
                <p className="text-xs text-gray-600 mb-2">
                  People with emails from your organization domain can access this rate card
                </p>
                <input
                  type="text"
                  value={userDomain}
                  disabled
                  className="form-input bg-gray-50 text-gray-500"
                  placeholder={userDomain || "yourcompany.com"}
                />
                {!userDomain && (
                  <p className="text-xs text-red-600 mt-1">
                    Unable to determine your organization domain. Please contact support.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNextClick}
          disabled={isNavigating}
          className="btn-primary w-full sm:w-auto order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNavigating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Next'
          )}
        </button>
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </form>
  )
}