import { Router } from 'express'
import type { Request, Response } from 'express'
import { Item } from '../models/Item'

const router = Router()

// GET all items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET single item
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await Item.findById(req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST create item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    const item = await Item.create({ name, description })
    res.status(201).json(item)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// PUT update item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    )
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    res.json(item)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// DELETE item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    res.json({ message: 'Item deleted' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router

