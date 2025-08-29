import { Router } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { Response } from 'express'

const router = Router()

router.post('/calculate', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Calculator endpoint - coming soon' })
})

router.post('/bulk-calculate', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Bulk calculator endpoint - coming soon' })
})

export default router