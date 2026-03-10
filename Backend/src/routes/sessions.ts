import express from 'express'
import { Session } from '../models/Session'
import { Player } from '../models/Player'

const router = express.Router()

// Create a session
router.post('/', async (req, res) => {
  try {
    const { organizerId, name } = req.body
    if (!organizerId) return res.status(400).json({ error: 'organizerId is required' })
    const session = await Session.create({ organizerId, name })
    return res.status(201).json({ session })
  } catch (err) {
    console.error('Create session error:', err)
    return res.status(500).json({ error: 'Failed to create session' })
  }
})

// Delete a session by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Session.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ error: 'Session not found' })
    return res.json({ success: true })
  } catch (err) {
    console.error('Delete session error:', err)
    return res.status(500).json({ error: 'Failed to delete session' })
  }
})

// Get sessions for an organizer (optional query ?organizerId=...)
router.get('/', async (req, res) => {
  try {
    const { organizerId } = req.query as { organizerId?: string }
    if (!organizerId) {
      // return recent sessions
      const list = await Session.find().sort({ startedAt: -1 }).limit(20)
      return res.json({ sessions: list })
    }
    const list = await Session.find({ organizerId }).sort({ startedAt: -1 })
    return res.json({ sessions: list })
  } catch (err) {
    console.error('List sessions error:', err)
    return res.status(500).json({ error: 'Failed to list sessions' })
  }
})

// Create multiple players for a session
router.post('/:id/players', async (req, res) => {
  try {
    const { id } = req.params
    const { players } = req.body
    if (!players || !Array.isArray(players)) return res.status(400).json({ error: 'players array required' })

    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const overwrite = (req.query && String(req.query.overwrite) === 'true')

    if (!overwrite) {
      const numbers = players.map((p: any) => p.nummer)
      // check duplicates already in DB for this session
      const existing = await Player.find({ sessionId: id, nummer: { $in: numbers } }).select('nummer')
      if (existing.length > 0) {
        const nums = existing.map((e: any) => e.nummer)
        return res.status(400).json({ error: `Some players already exist in session: ${nums.join(', ')}` })
      }
    } else {
      // overwrite: remove existing players for this session first
      await Player.deleteMany({ sessionId: id })
    }

    const docs = players.map((p: any) => ({
      sessionId: id,
      nummer: p.nummer,
      naam: p.naam,
      leeftijd: p.leeftijd,
      category: p.category || 'unknown'
    }))
    const created = await Player.insertMany(docs)
    return res.status(201).json({ created })
  } catch (err) {
    console.error('Create players error:', err)
    return res.status(500).json({ error: 'Failed to create players' })
  }
})

// List players for a session
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params
    const players = await Player.find({ sessionId: id }).sort({ nummer: 1 })
    return res.json({ players })
  } catch (err) {
    console.error('List players error:', err)
    return res.status(500).json({ error: 'Failed to list players' })
  }
})

export default router
