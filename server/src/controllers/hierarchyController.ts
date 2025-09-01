import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'

// Account Controllers
export const createAccount = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name } = req.body

    const account = await prisma.account.create({
      data: { name },
      include: {
        productSuites: {
          include: {
            skus: {
              include: {
                rateCards: true
              }
            }
          }
        }
      }
    })

    res.status(201).json({
      message: 'Account created successfully',
      account
    })
  } catch (error) {
    console.error('Create account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query

    const where: any = {}
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          productSuites: {
            include: {
              skus: {
                include: {
                  rateCards: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.account.count({ where })
    ])

    res.json({
      accounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get accounts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        productSuites: {
          include: {
            skus: {
              include: {
                rateCards: true
              }
            }
          }
        }
      }
    })

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    res.json({ account })
  } catch (error) {
    console.error('Get account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Product Suite Controllers
export const createProductSuite = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, accountId } = req.body

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return res.status(400).json({ error: 'Invalid account' })
    }

    const productSuite = await prisma.productSuite.create({
      data: { name, accountId },
      include: {
        account: true,
        skus: {
          include: {
            rateCards: true
          }
        }
      }
    })

    res.status(201).json({
      message: 'Product suite created successfully',
      productSuite
    })
  } catch (error) {
    console.error('Create product suite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getProductSuites = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, page = '1', limit = '20', search } = req.query

    const where: any = {}
    if (accountId) {
      where.accountId = accountId as string
    }
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [productSuites, total] = await Promise.all([
      prisma.productSuite.findMany({
        where,
        include: {
          account: true,
          skus: {
            include: {
              rateCards: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.productSuite.count({ where })
    ])

    res.json({
      productSuites,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get product suites error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getProductSuite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const productSuite = await prisma.productSuite.findUnique({
      where: { id },
      include: {
        account: true,
        skus: {
          include: {
            rateCards: true
          }
        }
      }
    })

    if (!productSuite) {
      return res.status(404).json({ error: 'Product suite not found' })
    }

    res.json({ productSuite })
  } catch (error) {
    console.error('Get product suite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// SKU Controllers
export const createSKU = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { code, name, productSuiteId } = req.body

    // Verify product suite exists
    const productSuite = await prisma.productSuite.findUnique({
      where: { id: productSuiteId }
    })

    if (!productSuite) {
      return res.status(400).json({ error: 'Invalid product suite' })
    }

    const sku = await prisma.sKU.create({
      data: { code, name, productSuiteId },
      include: {
        productSuite: {
          include: {
            account: true
          }
        },
        rateCards: true
      }
    })

    res.status(201).json({
      message: 'SKU created successfully',
      sku
    })
  } catch (error) {
    console.error('Create SKU error:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU code must be unique' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getSKUs = async (req: AuthRequest, res: Response) => {
  try {
    const { productSuiteId, page = '1', limit = '20', search } = req.query

    const where: any = {}
    if (productSuiteId) {
      where.productSuiteId = productSuiteId as string
    }
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [skus, total] = await Promise.all([
      prisma.sKU.findMany({
        where,
        include: {
          productSuite: {
            include: {
              account: true
            }
          },
          rateCards: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.sKU.count({ where })
    ])

    res.json({
      skus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get SKUs error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getSKU = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: {
        productSuite: {
          include: {
            account: true
          }
        },
        rateCards: true
      }
    })

    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' })
    }

    res.json({ sku })
  } catch (error) {
    console.error('Get SKU error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Full Hierarchy for Dropdown Population
export const getAccountsHierarchy = async (req: AuthRequest, res: Response) => {
  try {
    const { search, limit = '100' } = req.query

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        {
          productSuites: {
            some: {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                {
                  skus: {
                    some: {
                      OR: [
                        { code: { contains: search as string, mode: 'insensitive' } },
                        { name: { contains: search as string, mode: 'insensitive' } }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    }

    const limitNum = parseInt(limit as string)

    const accounts = await prisma.account.findMany({
      where,
      include: {
        productSuites: {
          include: {
            skus: {
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum
    })

    // Transform to flat structure for dropdown use
    const hierarchyOptions: Array<{
      id: string
      code: string
      name: string
      displayName: string
      accountName: string
      productSuiteName: string
      path: string
    }> = []

    accounts.forEach(account => {
      account.productSuites.forEach(productSuite => {
        productSuite.skus.forEach(sku => {
          hierarchyOptions.push({
            id: sku.id,
            code: sku.code,
            name: sku.name,
            displayName: `${sku.code} - ${sku.name}`,
            accountName: account.name,
            productSuiteName: productSuite.name,
            path: `${account.name} > ${productSuite.name} > ${sku.code} - ${sku.name}`
          })
        })
      })
    })

    res.json({
      hierarchy: accounts,
      options: hierarchyOptions,
      totalOptions: hierarchyOptions.length
    })
  } catch (error) {
    console.error('Get accounts hierarchy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}