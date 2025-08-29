import type { PricingModel } from '../../client/src/types/index.js'

export interface CSVTemplate {
  filename: string
  headers: string[]
  sampleData: string[][]
  instructions: string[]
}

export const CSV_TEMPLATES: Record<PricingModel, CSVTemplate> = {
  'tiered': {
    filename: 'tiered_pricing_template.csv',
    headers: [
      'name',
      'description',
      'folderId',
      'isActive',
      'tier1_min',
      'tier1_max',
      'tier1_price',
      'tier2_min',
      'tier2_max',
      'tier2_price',
      'tier3_min',
      'tier3_max',
      'tier3_price',
      'tier4_min',
      'tier4_max',
      'tier4_price',
      'tier5_min',
      'tier5_max',
      'tier5_price'
    ],
    sampleData: [
      [
        'Basic Consulting Rates',
        'Standard hourly rates with volume discounts',
        '', // folderId - optional
        'true',
        '1', '10', '150',
        '11', '25', '135',
        '26', '', '120', // empty max means unlimited
        '', '', '', // empty tier
        '', '', ''  // empty tier
      ],
      [
        'Premium Consulting',
        'Premium hourly rates for specialized work',
        '',
        'true',
        '1', '5', '200',
        '6', '15', '185',
        '16', '30', '170',
        '31', '', '155',
        '', '', ''
      ]
    ],
    instructions: [
      'Tiered Pricing Template Instructions:',
      '• name: Required - Name of the rate card',
      '• description: Optional - Description of the rate card',
      '• folderId: Optional - UUID of folder to place rate card in (leave empty for root)',
      '• isActive: true/false - Whether the rate card is active',
      '• tierX_min: Minimum quantity for this tier (required if tier is used)',
      '• tierX_max: Maximum quantity for this tier (leave empty for unlimited)',
      '• tierX_price: Price per unit for this tier (required if tier is used)',
      '• Use up to 5 tiers, leave unused tiers empty',
      '• Tiers must not overlap and should be in ascending order'
    ]
  },

  'seat-based': {
    filename: 'seat_based_pricing_template.csv',
    headers: [
      'name',
      'description',
      'folderId',
      'isActive',
      'pricePerSeat',
      'minimumSeats',
      'discount1_minSeats',
      'discount1_percent',
      'discount2_minSeats',
      'discount2_percent',
      'discount3_minSeats',
      'discount3_percent'
    ],
    sampleData: [
      [
        'Software License Basic',
        'Per-seat software licensing with volume discounts',
        '',
        'true',
        '50',
        '5',
        '10', '5',
        '25', '10',
        '50', '15'
      ],
      [
        'Enterprise Software License',
        'Enterprise per-seat licensing',
        '',
        'true',
        '75',
        '10',
        '50', '10',
        '100', '20',
        '250', '30'
      ]
    ],
    instructions: [
      'Seat-Based Pricing Template Instructions:',
      '• name: Required - Name of the rate card',
      '• description: Optional - Description of the rate card',
      '• folderId: Optional - UUID of folder to place rate card in',
      '• isActive: true/false - Whether the rate card is active',
      '• pricePerSeat: Required - Base price per seat',
      '• minimumSeats: Optional - Minimum number of seats required',
      '• discountX_minSeats: Minimum seats required for this discount tier',
      '• discountX_percent: Discount percentage (0-100) for this tier',
      '• Use up to 3 discount tiers, leave unused discounts empty'
    ]
  },

  'flat-rate': {
    filename: 'flat_rate_pricing_template.csv',
    headers: [
      'name',
      'description',
      'folderId',
      'isActive',
      'price',
      'billingPeriod'
    ],
    sampleData: [
      [
        'Project Setup Fee',
        'One-time project setup and configuration',
        '',
        'true',
        '5000',
        'one-time'
      ],
      [
        'Monthly Retainer',
        'Monthly consulting retainer',
        '',
        'true',
        '3000',
        'monthly'
      ],
      [
        'Annual Support Package',
        'Annual support and maintenance package',
        '',
        'true',
        '25000',
        'yearly'
      ]
    ],
    instructions: [
      'Flat-Rate Pricing Template Instructions:',
      '• name: Required - Name of the rate card',
      '• description: Optional - Description of the rate card',
      '• folderId: Optional - UUID of folder to place rate card in',
      '• isActive: true/false - Whether the rate card is active',
      '• price: Required - Fixed price amount',
      '• billingPeriod: one-time, monthly, or yearly'
    ]
  },

  'cost-plus': {
    filename: 'cost_plus_pricing_template.csv',
    headers: [
      'name',
      'description',
      'folderId',
      'isActive',
      'baseCost',
      'markupPercent'
    ],
    sampleData: [
      [
        'Hardware Resale',
        'Hardware resale with standard markup',
        '',
        'true',
        '1000',
        '25'
      ],
      [
        'Server Equipment',
        'Server equipment with premium markup',
        '',
        'true',
        '5000',
        '35'
      ]
    ],
    instructions: [
      'Cost-Plus Pricing Template Instructions:',
      '• name: Required - Name of the rate card',
      '• description: Optional - Description of the rate card',
      '• folderId: Optional - UUID of folder to place rate card in',
      '• isActive: true/false - Whether the rate card is active',
      '• baseCost: Required - Base cost before markup',
      '• markupPercent: Required - Markup percentage (0-1000)'
    ]
  },

  'subscription': {
    filename: 'subscription_pricing_template.csv',
    headers: [
      'name',
      'description',
      'folderId',
      'isActive',
      'monthlyPrice',
      'yearlyPrice',
      'setupFee',
      'features'
    ],
    sampleData: [
      [
        'Cloud Hosting Basic',
        'Basic cloud hosting plan',
        '',
        'true',
        '99',
        '999',
        '199',
        '5GB Storage; 100GB Bandwidth; Email Support'
      ],
      [
        'Cloud Hosting Premium',
        'Premium cloud hosting with advanced features',
        '',
        'true',
        '199',
        '1999',
        '0',
        '50GB Storage; 1TB Bandwidth; 24/7 Support; SSL Certificate; Daily Backups'
      ]
    ],
    instructions: [
      'Subscription Pricing Template Instructions:',
      '• name: Required - Name of the rate card',
      '• description: Optional - Description of the rate card',
      '• folderId: Optional - UUID of folder to place rate card in',
      '• isActive: true/false - Whether the rate card is active',
      '• monthlyPrice: Required - Monthly subscription price',
      '• yearlyPrice: Optional - Yearly subscription price',
      '• setupFee: Optional - One-time setup fee',
      '• features: Optional - Semicolon-separated list of features'
    ]
  }
}

export function generateCSVTemplate(pricingModel: PricingModel): string {
  const template = CSV_TEMPLATES[pricingModel]
  if (!template) {
    throw new Error(`Unknown pricing model: ${pricingModel}`)
  }

  const lines: string[] = []
  
  // Add instructions as comments
  lines.push('# ' + template.instructions.join('\n# '))
  lines.push('')
  
  // Add headers
  lines.push(template.headers.join(','))
  
  // Add sample data
  template.sampleData.forEach(row => {
    const csvRow = row.map(field => {
      // Escape fields containing commas, quotes, or newlines
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    }).join(',')
    lines.push(csvRow)
  })
  
  return lines.join('\n')
}

export function getTemplateHeaders(pricingModel: PricingModel): string[] {
  const template = CSV_TEMPLATES[pricingModel]
  if (!template) {
    throw new Error(`Unknown pricing model: ${pricingModel}`)
  }
  return template.headers
}

export function getTemplateFilename(pricingModel: PricingModel): string {
  const template = CSV_TEMPLATES[pricingModel]
  if (!template) {
    throw new Error(`Unknown pricing model: ${pricingModel}`)
  }
  return template.filename
}