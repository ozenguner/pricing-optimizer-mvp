import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rateCardService } from '../services/rateCards'
import { folderService } from '../services/folders'
import { hierarchyService } from '../services/hierarchy'
import { authService } from '../services/auth'
import type { RateCard, PricingModel, Folder, Currency, OwnerTeam, Account, ProductSuite, SKU, TieredPricing, SeatBasedPricing, FlatRatePricing, CostPlusPricing, SubscriptionPricing } from '../types'
import { CurrencySymbols } from '../types'

// Base schema for all rate cards
const baseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'JPY']),
  ownerTeam: z.enum(['Marketing', 'Sales', 'Pricing', 'Finance']),
  pricingModel: z.enum(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']),
  isActive: z.boolean(),
  skuId: z.string().optional(),
  folderId: z.string().optional(),
  sharingPermissions: z.object({
    type: z.enum(['internal', 'external']),
    allowedDomains: z.array(z.string()).optional(),
    permissions: z.object({
      level: z.enum(['view', 'edit', 'admin']),
      allowSharing: z.boolean().optional(),
      allowDownload: z.boolean().optional(),
      expiresAt: z.string().optional()
    })
  })
})

// Schemas for different pricing models
const tieredSchema = z.object({
  tiers: z.array(z.object({
    min: z.number().min(0),
    max: z.number().nullable(),
    pricePerUnit: z.number().min(0),
    costPerUnit: z.number().min(0).optional()
  })).min(1, 'At least one tier is required')
})

const seatBasedSchema = z.object({
  lineItems: z.array(z.object({
    name: z.string().min(1),
    pricePerSeat: z.number().min(0),
    costPerSeat: z.number().min(0).optional()
  })).min(1, 'At least one line item is required'),
  minimumSeats: z.number().min(0).optional()
})

const flatRateSchema = z.object({
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  billingPeriod: z.enum(['one-time', 'monthly', 'yearly']).optional()
})

const costPlusSchema = z.object({
  baseCost: z.number().min(0),
  costPerUnit: z.number().min(0).optional(),
  markupPercent: z.number().min(0),
  units: z.string().min(1)
})

const subscriptionSchema = z.object({
  termType: z.enum(['days', 'months', 'quarters', 'years']),
  pricePerTerm: z.number().min(0),
  costPerTerm: z.number().min(0).optional(),
  numberOfTerms: z.number().min(1),
  setupFee: z.number().min(0).optional(),
  features: z.array(z.string()).optional()
})

type FormData = z.infer<typeof baseSchema>

export function RateCardEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [rateCard, setRateCard] = useState<RateCard | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [productSuites, setProductSuites] = useState<ProductSuite[]>([])
  const [skus, setSKUs] = useState<SKU[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedProductSuiteId, setSelectedProductSuiteId] = useState<string>('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricingData, setPricingData] = useState<any>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'USD' as Currency,
      ownerTeam: 'Pricing' as OwnerTeam,
      pricingModel: 'tiered',
      isActive: true,
      skuId: '',
      folderId: '',
      sharingPermissions: {
        type: 'internal',
        permissions: {
          level: 'view',
          allowSharing: false,
          allowDownload: true
        }
      }
    }
  })

  const watchedPricingModel = watch('pricingModel')
  const watchedSharingType = watch('sharingPermissions.type')
  
  // Extract user domain from current user's email
  const currentUser = authService.getStoredUser()
  const userDomain = currentUser?.email ? currentUser.email.split('@')[1] : ''

  const getDefaultPricingData = (model: PricingModel) => {
    switch (model) {
      case 'tiered':
        return { tiers: [{ min: 0, max: null, pricePerUnit: 0, costPerUnit: 0 }] }
      case 'seat-based':
        return { lineItems: [{ name: 'Basic Seat', pricePerSeat: 0, costPerSeat: 0 }], minimumSeats: undefined }
      case 'flat-rate':
        return { price: 0, cost: 0, billingPeriod: 'one-time' }
      case 'cost-plus':
        return { baseCost: 0, costPerUnit: 0, markupPercent: 0, units: '' }
      case 'subscription':
        return { termType: 'months', pricePerTerm: 0, costPerTerm: 0, numberOfTerms: 1, setupFee: 0, features: [] }
      default:
        return {}
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [foldersResponse, accountsResponse, rateCardData] = await Promise.all([
          folderService.getAll(),
          hierarchyService.getAccounts({ limit: 100 }),
          isEditing && id ? rateCardService.getById(id) : Promise.resolve(null)
        ])

        setFolders(foldersResponse.folders)
        setAccounts(accountsResponse.accounts || [])

        if (rateCardData) {
          const { rateCard } = rateCardData
          setRateCard(rateCard)
          
          // If rate card has SKU, load the hierarchy
          if (rateCard.sku?.productSuite?.accountId) {
            setSelectedAccountId(rateCard.sku.productSuite.accountId)
            const productSuitesResponse = await hierarchyService.getProductSuites({ 
              accountId: rateCard.sku.productSuite.accountId 
            })
            setProductSuites(productSuitesResponse.productSuites || [])
            
            setSelectedProductSuiteId(rateCard.sku.productSuiteId)
            const skusResponse = await hierarchyService.getSKUs({ 
              productSuiteId: rateCard.sku.productSuiteId 
            })
            setSKUs(skusResponse.skus || [])
          }
          
          reset({
            name: rateCard.name,
            description: rateCard.description || '',
            currency: rateCard.currency || 'USD',
            ownerTeam: (rateCard.ownerTeam as OwnerTeam) || 'Pricing',
            pricingModel: rateCard.pricingModel,
            isActive: rateCard.isActive,
            skuId: rateCard.skuId || '',
            folderId: rateCard.folderId || '',
            sharingPermissions: rateCard.sharingPermissions || {
              type: 'internal',
              permissions: {
                level: 'view',
                allowSharing: false,
                allowDownload: true
              }
            }
          })
          setPricingData(rateCard.data)
        } else {
          // Initialize with default data for new rate cards
          const defaultModel = 'tiered' as PricingModel
          setPricingData(getDefaultPricingData(defaultModel))
        }
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, isEditing, reset])

  // Handle account selection change
  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId)
    setSelectedProductSuiteId('')
    setProductSuites([])
    setSKUs([])
    setValue('skuId', '')
    
    if (accountId) {
      try {
        const response = await hierarchyService.getProductSuites({ accountId })
        setProductSuites(response.productSuites || [])
      } catch (err) {
        console.error('Failed to load product suites:', err)
      }
    }
  }

  // Handle product suite selection change
  const handleProductSuiteChange = async (productSuiteId: string) => {
    setSelectedProductSuiteId(productSuiteId)
    setSKUs([])
    setValue('skuId', '')
    
    if (productSuiteId) {
      try {
        const response = await hierarchyService.getSKUs({ productSuiteId })
        setSKUs(response.skus || [])
      } catch (err) {
        console.error('Failed to load SKUs:', err)
      }
    }
  }

  const calculatePreview = (model: PricingModel, data: any, quantity: number = 10) => {
    try {
      if (!data || Object.keys(data).length === 0) {
        return 0
      }
      
      switch (model) {
        case 'tiered':
          return calculateTieredPrice(data as TieredPricing, quantity)
        case 'seat-based':
          return calculateSeatBasedPrice(data as SeatBasedPricing, quantity)
        case 'flat-rate':
          return calculateFlatRatePrice(data as FlatRatePricing)
        case 'cost-plus':
          return calculateCostPlusPrice(data as CostPlusPricing)
        case 'subscription':
          return calculateSubscriptionPrice(data as SubscriptionPricing)
        default:
          return 0
      }
    } catch (error) {
      console.error('Preview calculation error:', error)
      return 0
    }
  }

  const calculateTieredPrice = (data: TieredPricing, quantity: number) => {
    if (!data.tiers || data.tiers.length === 0) return 0
    
    let total = 0
    let remaining = quantity

    for (const tier of data.tiers.sort((a, b) => a.min - b.min)) {
      if (remaining <= 0) break
      
      const tierMin = tier.min
      const tierMax = tier.max || Infinity
      const tierSize = Math.min(remaining, tierMax - tierMin + 1)
      
      if (quantity > tierMin) {
        total += tierSize * tier.pricePerUnit
        remaining -= tierSize
      }
    }

    return total
  }

  const calculateSeatBasedPrice = (data: SeatBasedPricing, seats: number) => {
    if (!data.lineItems || data.lineItems.length === 0) return 0
    
    return data.lineItems.reduce((total, item) => {
      return total + (seats * item.pricePerSeat)
    }, 0)
  }

  const calculateFlatRatePrice = (data: FlatRatePricing) => {
    return data.price || 0
  }

  const calculateCostPlusPrice = (data: CostPlusPricing) => {
    const baseCost = data.baseCost || 0
    const markup = baseCost * (data.markupPercent / 100)
    return baseCost + markup
  }

  const calculateSubscriptionPrice = (data: SubscriptionPricing) => {
    if (!data.pricePerTerm || !data.numberOfTerms) return 0
    
    const totalPrice = data.pricePerTerm * data.numberOfTerms
    return totalPrice + (data.setupFee || 0)
  }

  const onSubmit = async (formData: FormData) => {
    try {
      setSaving(true)
      setError(null)

      // Validate pricing data based on model
      const isValid = rateCardService.validatePricingData(formData.pricingModel, pricingData)
      if (!isValid) {
        throw new Error('Invalid pricing data for the selected model')
      }

      const rateCardData = {
        ...formData,
        data: pricingData,
        folderId: formData.folderId || undefined
      }

      if (isEditing && id) {
        await rateCardService.update(id, rateCardData)
      } else {
        await rateCardService.create(rateCardData)
      }

      navigate('/rate-cards')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save rate card')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Rate Card' : 'Create Rate Card'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditing ? 'Update your pricing structure' : 'Build a new pricing structure for your products or services'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium">Basic Information</h2>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="form-label">Name</label>
                  <input
                    {...register('name')}
                    type="text"
                    className="form-input"
                    placeholder="Enter rate card name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="form-input"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="form-label">Owner Team</label>
                  <select {...register('ownerTeam')} className="form-input">
                    <option value="Pricing">Pricing</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Currency</label>
                  <select {...register('currency')} className="form-input">
                    <option value="USD">$ USD - US Dollar</option>
                    <option value="EUR">€ EUR - Euro</option>
                    <option value="GBP">£ GBP - British Pound</option>
                    <option value="CAD">C$ CAD - Canadian Dollar</option>
                    <option value="JPY">¥ JPY - Japanese Yen</option>
                  </select>
                </div>

                {/* Hierarchical Structure Section */}
                <div className="border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Product Hierarchy (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Link this rate card to a specific SKU in your product hierarchy for better organization
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">Account</label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => handleAccountChange(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Select an account (optional)</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedAccountId && (
                      <div>
                        <label className="form-label">Product Suite</label>
                        <select
                          value={selectedProductSuiteId}
                          onChange={(e) => handleProductSuiteChange(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Select a product suite</option>
                          {productSuites.map(suite => (
                            <option key={suite.id} value={suite.id}>
                              {suite.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedProductSuiteId && (
                      <div>
                        <label className="form-label">SKU</label>
                        <select {...register('skuId')} className="form-input">
                          <option value="">Select a SKU</option>
                          {skus.map(sku => (
                            <option key={sku.id} value={sku.id}>
                              {sku.code} - {sku.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Folder</label>
                  <select {...register('folderId')} className="form-input">
                    <option value="">Root (No folder)</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Pricing Model</label>
                  <select
                    {...register('pricingModel')}
                    className="form-input"
                    onChange={(e) => {
                      const newModel = e.target.value as PricingModel
                      setValue('pricingModel', newModel)
                      // Initialize with appropriate default data structure
                      const defaultData = getDefaultPricingData(newModel)
                      setPricingData(defaultData)
                    }}
                  >
                    <option value="tiered">Tiered Pricing</option>
                    <option value="seat-based">Seat-Based Pricing</option>
                    <option value="flat-rate">Flat-Rate Pricing</option>
                    <option value="cost-plus">Cost-Plus Pricing</option>
                    <option value="subscription">Subscription Pricing</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Active (available for calculations)
                  </label>
                </div>
              </div>
            </div>

            {/* Sharing Permissions */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium">Sharing & Permissions</h2>
                <p className="text-sm text-gray-600">Control who can access this rate card</p>
              </div>
              <div className="card-body space-y-4">
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
                        <p className="text-xs text-gray-600">Anyone with the link can access this rate card (requires explicit sharing)</p>
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

            {/* Pricing Model Specific Forms */}
            <PricingModelForm
              pricingModel={watchedPricingModel}
              data={pricingData}
              onChange={setPricingData}
            />

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/rate-cards')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header">
              <h2 className="text-lg font-medium">Live Preview</h2>
            </div>
            <div className="card-body">
              <PricingPreview
                pricingModel={watchedPricingModel}
                data={pricingData}
                currency={watch('currency') || 'USD'}
                calculatePreview={calculatePreview}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PricingModelFormProps {
  pricingModel: PricingModel
  data: any
  onChange: (data: any) => void
}

function PricingModelForm({ pricingModel, data, onChange }: PricingModelFormProps) {
  switch (pricingModel) {
    case 'tiered':
      return <TieredPricingForm data={data} onChange={onChange} />
    case 'seat-based':
      return <SeatBasedPricingForm data={data} onChange={onChange} />
    case 'flat-rate':
      return <FlatRatePricingForm data={data} onChange={onChange} />
    case 'cost-plus':
      return <CostPlusPricingForm data={data} onChange={onChange} />
    case 'subscription':
      return <SubscriptionPricingForm data={data} onChange={onChange} />
    default:
      return null
  }
}

function TieredPricingForm({ data, onChange }: { data: TieredPricing, onChange: (data: any) => void }) {
  const tiers = data.tiers || [{ min: 0, max: null, pricePerUnit: 0, costPerUnit: 0 }]

  const addTier = () => {
    const newTiers = [...tiers, { min: 0, max: null, pricePerUnit: 0, costPerUnit: 0 }]
    onChange({ ...data, tiers: newTiers })
  }

  const removeTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index)
    onChange({ ...data, tiers: newTiers })
  }

  const updateTier = (index: number, field: string, value: any) => {
    const newTiers = tiers.map((tier, i) => 
      i === index ? { ...tier, [field]: value } : tier
    )
    onChange({ ...data, tiers: newTiers })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Tiered Pricing Configuration</h3>
      </div>
      <div className="card-body space-y-4">
        {tiers.map((tier, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Tier {index + 1}</h4>
              {tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="form-label text-sm">Min Quantity</label>
                <input
                  type="number"
                  value={tier.min}
                  onChange={(e) => updateTier(index, 'min', parseInt(e.target.value) || 0)}
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label text-sm">Max Quantity</label>
                <input
                  type="number"
                  value={tier.max || ''}
                  onChange={(e) => updateTier(index, 'max', e.target.value ? parseInt(e.target.value) : null)}
                  className="form-input"
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-sm">Price per Unit</label>
                <input
                  type="number"
                  value={tier.pricePerUnit}
                  onChange={(e) => updateTier(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                  className="form-input"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label text-sm">Cost per Unit (Optional)</label>
                <input
                  type="number"
                  value={tier.costPerUnit || ''}
                  onChange={(e) => updateTier(index, 'costPerUnit', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="form-input"
                  step="0.01"
                  min="0"
                  placeholder="For margin calculation"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addTier}
          className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
        >
          Add Tier
        </button>
      </div>
    </div>
  )
}

function SeatBasedPricingForm({ data, onChange }: { data: SeatBasedPricing, onChange: (data: any) => void }) {
  const lineItems = data.lineItems || [{ name: 'Basic Seat', pricePerSeat: 0, costPerSeat: 0 }]

  const addLineItem = () => {
    const newLineItems = [...lineItems, { name: '', pricePerSeat: 0, costPerSeat: 0 }]
    onChange({ ...data, lineItems: newLineItems })
  }

  const removeLineItem = (index: number) => {
    const newLineItems = lineItems.filter((_, i) => i !== index)
    onChange({ ...data, lineItems: newLineItems })
  }

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = lineItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    onChange({ ...data, lineItems: newLineItems })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Seat-Based Pricing Configuration</h3>
        <p className="text-sm text-gray-600">Configure multiple line items with different per-seat pricing</p>
      </div>
      <div className="card-body space-y-4">
        <div>
          <label className="form-label">Minimum Seats (Optional)</label>
          <input
            type="number"
            value={data.minimumSeats || ''}
            onChange={(e) => onChange({ ...data, minimumSeats: parseInt(e.target.value) || undefined })}
            className="form-input"
            min="0"
            placeholder="No minimum requirement"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Line Items</h4>
            <button
              type="button"
              onClick={addLineItem}
              className="text-primary-600 hover:text-primary-800 text-sm"
            >
              Add Line Item
            </button>
          </div>
          
          {lineItems.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg mb-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Line Item {index + 1}</span>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="form-label text-sm">Item Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Premium License, Basic Access"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-sm">Price per Seat</label>
                    <input
                      type="number"
                      value={item.pricePerSeat}
                      onChange={(e) => updateLineItem(index, 'pricePerSeat', parseFloat(e.target.value) || 0)}
                      className="form-input"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="form-label text-sm">Cost per Seat (Optional)</label>
                    <input
                      type="number"
                      value={item.costPerSeat || ''}
                      onChange={(e) => updateLineItem(index, 'costPerSeat', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="form-input"
                      step="0.01"
                      min="0"
                      placeholder="For margin calculation"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FlatRatePricingForm({ data, onChange }: { data: FlatRatePricing, onChange: (data: any) => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Flat-Rate Pricing Configuration</h3>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Price</label>
            <input
              type="number"
              value={data.price || ''}
              onChange={(e) => onChange({ ...data, price: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="form-label">Cost (Optional)</label>
            <input
              type="number"
              value={data.cost || ''}
              onChange={(e) => onChange({ ...data, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="form-input"
              step="0.01"
              min="0"
              placeholder="For margin calculation"
            />
          </div>
        </div>
        <div>
          <label className="form-label">Billing Period</label>
          <select
            value={data.billingPeriod || 'one-time'}
            onChange={(e) => onChange({ ...data, billingPeriod: e.target.value })}
            className="form-input"
          >
            <option value="one-time">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function CostPlusPricingForm({ data, onChange }: { data: CostPlusPricing, onChange: (data: any) => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Cost-Plus Pricing Configuration</h3>
        <p className="text-sm text-gray-600">Set a base cost and markup percentage</p>
      </div>
      <div className="card-body space-y-4">
        <div>
          <label className="form-label">Units</label>
          <input
            type="text"
            value={data.units || ''}
            onChange={(e) => onChange({ ...data, units: e.target.value })}
            className="form-input"
            placeholder="e.g., hours, days, licenses, etc."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Base Cost</label>
            <input
              type="number"
              value={data.baseCost || ''}
              onChange={(e) => onChange({ ...data, baseCost: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="form-label">Cost per Unit (Optional)</label>
            <input
              type="number"
              value={data.costPerUnit || ''}
              onChange={(e) => onChange({ ...data, costPerUnit: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="form-input"
              step="0.01"
              min="0"
              placeholder="For margin calculation"
            />
          </div>
        </div>
        <div>
          <label className="form-label">Markup Percentage</label>
          <input
            type="number"
            value={data.markupPercent || ''}
            onChange={(e) => onChange({ ...data, markupPercent: parseFloat(e.target.value) || 0 })}
            className="form-input"
            step="0.1"
            min="0"
            placeholder="e.g., 25 for 25%"
          />
        </div>
      </div>
    </div>
  )
}

function SubscriptionPricingForm({ data, onChange }: { data: SubscriptionPricing, onChange: (data: any) => void }) {
  const features = data.features || []

  const addFeature = () => {
    const newFeatures = [...features, '']
    onChange({ ...data, features: newFeatures })
  }

  const removeFeature = (index: number) => {
    const newFeatures = features.filter((_, i) => i !== index)
    onChange({ ...data, features: newFeatures })
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = features.map((feature, i) => 
      i === index ? value : feature
    )
    onChange({ ...data, features: newFeatures })
  }

  const calculateTotal = () => {
    const termTotal = (data.pricePerTerm || 0) * (data.numberOfTerms || 0)
    return termTotal + (data.setupFee || 0)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Subscription Pricing Configuration</h3>
        <p className="text-sm text-gray-600">Configure term-based subscription pricing</p>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Subscription Term Type</label>
            <select
              value={data.termType || 'months'}
              onChange={(e) => onChange({ ...data, termType: e.target.value as any })}
              className="form-input"
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="quarters">Quarters</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div>
            <label className="form-label">Number of Terms</label>
            <input
              type="number"
              value={data.numberOfTerms || ''}
              onChange={(e) => onChange({ ...data, numberOfTerms: parseInt(e.target.value) || 1 })}
              className="form-input"
              min="1"
              placeholder="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Price per Term</label>
            <input
              type="number"
              value={data.pricePerTerm || ''}
              onChange={(e) => onChange({ ...data, pricePerTerm: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="form-label">Cost per Term (Optional)</label>
            <input
              type="number"
              value={data.costPerTerm || ''}
              onChange={(e) => onChange({ ...data, costPerTerm: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="form-input"
              step="0.01"
              min="0"
              placeholder="For margin calculation"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Setup Fee (Optional)</label>
          <input
            type="number"
            value={data.setupFee || ''}
            onChange={(e) => onChange({ ...data, setupFee: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="form-input"
            step="0.01"
            min="0"
            placeholder="One-time setup fee"
          />
        </div>

        {data.pricePerTerm && data.numberOfTerms && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-medium">Subscription Summary:</div>
              <div>Price: {data.pricePerTerm} × {data.numberOfTerms} {data.termType} = {(data.pricePerTerm * data.numberOfTerms).toFixed(2)}</div>
              {data.setupFee && <div>Setup Fee: {data.setupFee}</div>}
              <div className="font-medium">Total: {calculateTotal().toFixed(2)}</div>
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Features (Optional)</label>
            <button
              type="button"
              onClick={addFeature}
              className="text-primary-600 hover:text-primary-800 text-sm"
            >
              Add Feature
            </button>
          </div>
          
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3 mb-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                className="form-input flex-1"
                placeholder="Enter feature description"
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PricingPreviewProps {
  pricingModel: PricingModel
  data: any
  currency: Currency
  calculatePreview: (model: PricingModel, data: any, quantity?: number) => number
}

function PricingPreview({ pricingModel, data, currency, calculatePreview }: PricingPreviewProps) {
  const previewQuantity = 10 // Fixed quantity for preview
  const price = calculatePreview(pricingModel, data, previewQuantity)

  const formatCurrency = (amount: number) => {
    const currencyCode = currency || 'USD'
    const symbol = CurrencySymbols[currencyCode] || '$'
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol'
    }).format(amount).replace(/^[^0-9-]+/, symbol)
  }

  const getPreviewLabel = () => {
    switch (pricingModel) {
      case 'seat-based':
        return `for ${previewQuantity} seats`
      case 'tiered':
        return `for ${previewQuantity} units`
      case 'flat-rate':
        return data.billingPeriod ? `per ${data.billingPeriod.replace('-', ' ')}` : 'total price'
      case 'cost-plus':
        return data.units ? `per ${data.units}` : 'total price'
      case 'subscription':
        return data.termType ? `total for ${data.numberOfTerms || 1} ${data.termType}` : 'total subscription'
      default:
        return 'total price'
    }
  }

  const renderModelSpecificInfo = () => {
    switch (pricingModel) {
      case 'tiered':
        if (data.tiers && data.tiers.length > 0) {
          return (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Pricing Tiers</h4>
              {data.tiers.map((tier: any, index: number) => (
                <div key={index} className="text-xs text-gray-600 flex justify-between">
                  <span>{tier.min} - {tier.max || '∞'} units</span>
                  <span>{formatCurrency(tier.pricePerUnit)}/unit</span>
                </div>
              ))}
            </div>
          )
        }
        break
      
      case 'seat-based':
        if (data.lineItems && data.lineItems.length > 0) {
          return (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Line Items</h4>
              {data.lineItems.map((item: any, index: number) => (
                <div key={index} className="text-xs text-gray-600 flex justify-between">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.pricePerSeat)}/seat</span>
                </div>
              ))}
              {data.minimumSeats && (
                <div className="text-xs text-blue-600">
                  Minimum: {data.minimumSeats} seats
                </div>
              )}
            </div>
          )
        }
        break
      
      case 'subscription':
        if (data.pricePerTerm && data.numberOfTerms) {
          return (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Subscription Details</h4>
              <div className="text-xs text-gray-600">
                <div>Price per {data.termType?.slice(0, -1) || 'term'}: {formatCurrency(data.pricePerTerm)}</div>
                <div>Number of {data.termType || 'terms'}: {data.numberOfTerms}</div>
                {data.setupFee && <div>Setup fee: {formatCurrency(data.setupFee)}</div>}
              </div>
            </div>
          )
        }
        break
      
      case 'cost-plus':
        if (data.baseCost && data.markupPercent) {
          const markup = data.baseCost * (data.markupPercent / 100)
          return (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Cost Breakdown</h4>
              <div className="text-xs text-gray-600">
                <div>Base cost: {formatCurrency(data.baseCost)}</div>
                <div>Markup ({data.markupPercent}%): {formatCurrency(markup)}</div>
                {data.units && <div>Unit: {data.units}</div>}
              </div>
            </div>
          )
        }
        break
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Output Preview</h3>
        <div className="text-sm text-gray-600">
          Model: <span className="font-medium capitalize">{pricingModel.replace('-', ' ')}</span>
        </div>
      </div>

      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-900">
            {formatCurrency(price)}
          </div>
          <div className="text-sm text-primary-600">
            {getPreviewLabel()}
          </div>
        </div>
      </div>

      {renderModelSpecificInfo()}

      {(() => {
        try {
          const hasCostData = data && typeof data === 'object' && Object.values(data).some((value: any) => {
            if (Array.isArray(value)) {
              return value.some(item => typeof item === 'object' && Object.keys(item).some(key => key.toLowerCase().includes('cost')))
            }
            if (typeof value === 'object' && value !== null) {
              return Object.keys(value).some(key => key.toLowerCase().includes('cost'))
            }
            return false
          })
          
          return hasCostData && (
            <div className="text-xs text-green-600 text-center">
              💰 Cost data available for margin calculations
            </div>
          )
        } catch (error) {
          console.error('Cost detection error:', error)
          return null
        }
      })()}
    </div>
  )
}export default RateCardEditor
