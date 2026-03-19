import { Router } from 'express'
import type { Request, Response } from 'express'
import { Organizer } from '../models/Organizer'

const router = Router()

// GET all organizers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await Organizer.find().sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET single organizer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await Organizer.findById(req.params.id)
    if (!user) {
      res.status(404).json({ error: 'Organizer not found' })
      return
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST create organizer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    const user = await Organizer.create({ email, password, name })
    res.status(201).json(user)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// PUT update organizer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    const user = await Organizer.findByIdAndUpdate(
      req.params.id,
      { email, password, name },
      { new: true, runValidators: true }
    )
    if (!user) {
      res.status(404).json({ error: 'Organizer not found' })
      return
    }
    res.json(user)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// DELETE organizer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await Organizer.findByIdAndDelete(req.params.id)
    if (!user) {
      res.status(404).json({ error: 'Organizer not found' })
      return
    }
    res.json({ message: 'Organizer deleted' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router

