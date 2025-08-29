import { Router } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { Response } from 'express'

const router = Router()

router.get('/', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Rate cards endpoint - coming soon' })
})

router.post('/', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Create rate card endpoint - coming soon' })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Get rate card endpoint - coming soon' })
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Update rate card endpoint - coming soon' })
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Delete rate card endpoint - coming soon' })
})

export default router