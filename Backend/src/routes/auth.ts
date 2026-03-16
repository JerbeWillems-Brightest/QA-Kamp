import { Router } from 'express'
import type { Request, Response } from 'express'
import { Organizer } from '../models/Organizer'

const router = Router()

// POST /api/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord nodig' })

    const user = await Organizer.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(401).json({ error: 'Foute logingegevens' })

    // Plain text compare for now (we'll hash later)
    if (user.password !== password) return res.status(401).json({ error: 'Foute logingegevens' })

    // Successful login
    res.json({ message: 'Succesvol ingelogd', user: { id: user._id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router

