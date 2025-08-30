import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rateCardService } from '../services/rateCards'
import { folderService } from '../services/folders'
import type { RateCard, PricingModel, Folder, TieredPricing, SeatBasedPricing, FlatRatePricing, CostPlusPricing, SubscriptionPricing } from '../types'

// Base schema for all rate cards
const baseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  pricingModel: z.enum(['tiered', 'seat-based', 'flat-rate', 'cost-plus', 'subscription']),
  isActive: z.boolean(),
  folderId: z.string().optional()
})

// Schemas for different pricing models
const tieredSchema = z.object({
  tiers: z.array(z.object({
    min: z.number().min(0),
    max: z.number().nullable(),
    pricePerUnit: z.number().min(0)
  })).min(1, 'At least one tier is required')
})

const seatBasedSchema = z.object({
  pricePerSeat: z.number().min(0),
  minimumSeats: z.number().min(0).optional(),
  volumeDiscounts: z.array(z.object({
    minSeats: z.number().min(1),
    discountPercent: z.number().min(0).max(100)
  })).optional()
})

const flatRateSchema = z.object({
  price: z.number().min(0),
  billingPeriod: z.enum(['one-time', 'monthly', 'yearly']).optional()
})

const costPlusSchema = z.object({
  baseCost: z.number().min(0),
  markupPercent: z.number().min(0)
})

const subscriptionSchema = z.object({
  monthlyPrice: z.number().min(0),
  yearlyPrice: z.number().min(0).optional(),
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
      pricingModel: 'tiered',
      isActive: true,
      folderId: ''
    }
  })

  const watchedPricingModel = watch('pricingModel')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [foldersResponse, rateCardData] = await Promise.all([
          folderService.getAll(),
          isEditing && id ? rateCardService.getById(id) : Promise.resolve(null)
        ])

        setFolders(foldersResponse.folders)

        if (rateCardData) {
          const { rateCard } = rateCardData
          setRateCard(rateCard)
          reset({
            name: rateCard.name,
            description: rateCard.description || '',
            pricingModel: rateCard.pricingModel,
            isActive: rateCard.isActive,
            folderId: rateCard.folderId || ''
          })
          setPricingData(rateCard.data)
        }
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, isEditing, reset])

  const calculatePreview = (model: PricingModel, data: any, quantity: number = 10) => {
    try {
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
    } catch {
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
    const basePrice = seats * data.pricePerSeat
    
    if (data.volumeDiscounts) {
      const applicableDiscount = data.volumeDiscounts
        .filter(d => seats >= d.minSeats)
        .sort((a, b) => b.discountPercent - a.discountPercent)[0]
      
      if (applicableDiscount) {
        return basePrice * (1 - applicableDiscount.discountPercent / 100)
      }
    }

    return basePrice
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
    return data.monthlyPrice || 0
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
                      setValue('pricingModel', e.target.value as PricingModel)
                      setPricingData({}) // Reset pricing data when model changes
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
  const tiers = data.tiers || [{ min: 0, max: null, pricePerUnit: 0 }]

  const addTier = () => {
    const newTiers = [...tiers, { min: 0, max: null, pricePerUnit: 0 }]
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
            <div className="grid grid-cols-3 gap-3">
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
  const volumeDiscounts = data.volumeDiscounts || []

  const addVolumeDiscount = () => {
    const newDiscounts = [...volumeDiscounts, { minSeats: 1, discountPercent: 0 }]
    onChange({ ...data, volumeDiscounts: newDiscounts })
  }

  const removeVolumeDiscount = (index: number) => {
    const newDiscounts = volumeDiscounts.filter((_, i) => i !== index)
    onChange({ ...data, volumeDiscounts: newDiscounts })
  }

  const updateVolumeDiscount = (index: number, field: string, value: any) => {
    const newDiscounts = volumeDiscounts.map((discount, i) => 
      i === index ? { ...discount, [field]: value } : discount
    )
    onChange({ ...data, volumeDiscounts: newDiscounts })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Seat-Based Pricing Configuration</h3>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Price per Seat</label>
            <input
              type="number"
              value={data.pricePerSeat || ''}
              onChange={(e) => onChange({ ...data, pricePerSeat: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="form-label">Minimum Seats</label>
            <input
              type="number"
              value={data.minimumSeats || ''}
              onChange={(e) => onChange({ ...data, minimumSeats: parseInt(e.target.value) || undefined })}
              className="form-input"
              min="0"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Volume Discounts</h4>
            <button
              type="button"
              onClick={addVolumeDiscount}
              className="text-primary-600 hover:text-primary-800 text-sm"
            >
              Add Discount
            </button>
          </div>
          
          {volumeDiscounts.map((discount, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Discount {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeVolumeDiscount(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-sm">Min Seats</label>
                  <input
                    type="number"
                    value={discount.minSeats}
                    onChange={(e) => updateVolumeDiscount(index, 'minSeats', parseInt(e.target.value) || 1)}
                    className="form-input"
                    min="1"
                  />
                </div>
                <div>
                  <label className="form-label text-sm">Discount %</label>
                  <input
                    type="number"
                    value={discount.discountPercent}
                    onChange={(e) => updateVolumeDiscount(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                    className="form-input"
                    min="0"
                    max="100"
                    step="0.1"
                  />
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
    </div>
  )
}

function CostPlusPricingForm({ data, onChange }: { data: CostPlusPricing, onChange: (data: any) => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Cost-Plus Pricing Configuration</h3>
      </div>
      <div className="card-body space-y-4">
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
            <label className="form-label">Markup Percentage</label>
            <input
              type="number"
              value={data.markupPercent || ''}
              onChange={(e) => onChange({ ...data, markupPercent: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.1"
              min="0"
            />
          </div>
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

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium">Subscription Pricing Configuration</h3>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="form-label">Monthly Price</label>
            <input
              type="number"
              value={data.monthlyPrice || ''}
              onChange={(e) => onChange({ ...data, monthlyPrice: parseFloat(e.target.value) || 0 })}
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="form-label">Yearly Price</label>
            <input
              type="number"
              value={data.yearlyPrice || ''}
              onChange={(e) => onChange({ ...data, yearlyPrice: parseFloat(e.target.value) || undefined })}
              className="form-input"
              step="0.01"
              min="0"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="form-label">Setup Fee</label>
            <input
              type="number"
              value={data.setupFee || ''}
              onChange={(e) => onChange({ ...data, setupFee: parseFloat(e.target.value) || undefined })}
              className="form-input"
              step="0.01"
              min="0"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Features</label>
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
  calculatePreview: (model: PricingModel, data: any, quantity?: number) => number
}

function PricingPreview({ pricingModel, data, calculatePreview }: PricingPreviewProps) {
  const [previewQuantity, setPreviewQuantity] = useState(10)

  const price = calculatePreview(pricingModel, data, previewQuantity)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getQuantityLabel = () => {
    switch (pricingModel) {
      case 'seat-based':
        return 'Seats'
      case 'tiered':
        return 'Quantity'
      case 'flat-rate':
      case 'cost-plus':
      case 'subscription':
        return 'Units'
      default:
        return 'Quantity'
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Preview Calculation</h3>
        <div className="text-sm text-gray-600">
          Model: <span className="font-medium capitalize">{pricingModel.replace('-', ' ')}</span>
        </div>
      </div>

      {pricingModel !== 'flat-rate' && pricingModel !== 'subscription' && (
        <div>
          <label className="form-label text-sm">{getQuantityLabel()}</label>
          <input
            type="number"
            value={previewQuantity}
            onChange={(e) => setPreviewQuantity(parseInt(e.target.value) || 1)}
            className="form-input"
            min="1"
          />
        </div>
      )}

      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-900">
            {formatCurrency(price)}
          </div>
          {pricingModel !== 'flat-rate' && pricingModel !== 'subscription' && (
            <div className="text-sm text-primary-600">
              for {previewQuantity} {getQuantityLabel().toLowerCase()}
            </div>
          )}
          {pricingModel === 'subscription' && (
            <div className="text-sm text-primary-600">
              per month
            </div>
          )}
        </div>
      </div>

      {/* Pricing breakdown for tiered model */}
      {pricingModel === 'tiered' && data.tiers && data.tiers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Pricing Tiers</h4>
          {data.tiers.map((tier: any, index: number) => (
            <div key={index} className="text-xs text-gray-600 flex justify-between">
              <span>
                {tier.min} - {tier.max || '∞'}: {formatCurrency(tier.pricePerUnit)}/unit
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}