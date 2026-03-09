import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

// Items endpoint removed — return 410 Gone
router.all('/*', (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Items API removed' })
})

export default router
