import express from 'express'
import { Session } from '../models/Session'
import { Player } from '../models/Player'

const router = express.Router()


let _gen = function (length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude ambiguous 0,O,1,I
  let out = ''
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}
function generateCode(length = 6) {
  return _gen(length)
}
export const __test = {
  setGenerateCode: (fn: (n?: number) => string) => { _gen = fn },
  getGenerateCode: () => _gen,
}
void __test

router.post('/', async (req, res) => {
  try {
    const { organizerId, name } = req.body
    if (!organizerId) return res.status(400).json({ error: 'organizerId is required' })

    try {
      const existing = await Session.findOne({ organizerId, active: true }).sort({ createdAt: -1 })
      if (existing) {
        return res.status(200).json({ session: existing })
      }
    } catch (err) {
      console.warn('Error checking existing active session:', err)
    }

    const MAX_ATTEMPTS = 10
    let attempt = 0
    let createdSession = null
    while (attempt < MAX_ATTEMPTS && !createdSession) {
      const code = generateCode(6)
      try {
        createdSession = await Session.create({ organizerId, name, code, active: true })
      } catch (err: any) {
        const dup = err && (err.code === 11000 || (err.codeName && err.codeName === 'DuplicateKey'))
        if (dup) {
          attempt++
          continue
        }
        console.error('Create session DB error:', err)
        return res.status(500).json({ error: 'Failed to create session' })
      }
    }

    if (!createdSession) return res.status(500).json({ error: 'Could not generate unique session code, please retry' })
    return res.status(201).json({ session: createdSession })
  } catch (err) {
    console.error('Create session error:', err)
    return res.status(500).json({ error: 'Failed to create session' })
  }
})

router.get('/active', async (_req, res) => {
  try {
    const active = await Session.findOne({ active: true }).sort({ createdAt: -1 })
    if (!active) return res.status(404).json({ error: 'No active session' })
    return res.json({ session: active })
  } catch (err) {
    console.error('Get active session error:', err)
    return res.status(500).json({ error: 'Failed to get active session' })
  }
})

router.post('/join', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'code is required' })
    const codeClean = String(code).trim().toUpperCase()

    const session = await Session.findOne({ code: codeClean })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (!session.active) return res.status(400).json({ error: 'Session is not active' })

    return res.json({ session: { id: session._id, organizerId: session.organizerId, name: session.name, code: session.code } })
  } catch (err) {
    console.error('Join session error:', err)
    return res.status(500).json({ error: 'Failed to join session' })
  }
})

router.post('/active/join', async (req, res) => {
  try {
    const { playerNumber } = req.body || {}
    if (!playerNumber) return res.status(400).json({ error: 'playerNumber is required' })

    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }
    const normalized = normalizeNumber(playerNumber)
    if (!normalized) return res.status(400).json({ error: 'Invalid playerNumber' })

    const session = await Session.findOne({ active: true }).sort({ createdAt: -1 })
    if (!session) return res.status(404).json({ error: 'No active session' })

    const now = new Date()

    const updatedPlayer = await Player.findOneAndUpdate(
      {
        sessionId: session._id,
        playerNumber: normalized,
        lastSeen: null,
      },
      { lastSeen: now },
      { new: true }
    )

    if (!updatedPlayer) {
      const exists = await Player.findOne({ sessionId: session._id, playerNumber: normalized })
      if (!exists) return res.status(404).json({ error: 'Player not found in active session' })

      return res.status(409).json({ error: 'Speler is al online op een ander apparaat' })
    }

    return res.json({ session: { id: session._id, code: session.code, name: session.name }, player: updatedPlayer })
  } catch (err) {
    console.error('Active join error:', err)
    return res.status(500).json({ error: 'Failed to join active session' })
  }
})


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })


    try {
      await Player.deleteMany({ sessionId: id })
    } catch (delErr) {
      console.error('Error deleting players for session', id, delErr)
      return res.status(500).json({ error: 'Failed to delete players for session' })
    }

    await Session.findByIdAndDelete(id)
    return res.json({ success: true })
  } catch (err) {
    console.error('Delete session error:', err)
    return res.status(500).json({ error: 'Failed to delete session' })
  }
})

router.get('/', async (req, res) => {
  try {
    const { organizerId } = req.query as { organizerId?: string }
    if (!organizerId) {
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

router.post('/:id/players', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    let players: any[] | undefined
    if (Array.isArray(req.body)) players = req.body
    else if (req.body && Array.isArray(req.body.players)) players = req.body.players
    else players = undefined

    if (!players || !Array.isArray(players)) {
      console.error('POST /:id/players called with invalid body type:', typeof req.body, 'body:', req.body)
      return res.status(400).json({ error: 'players array required' })
    }

    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const overwrite = (req.query && String(req.query.overwrite) === 'true')

    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }

    const validationErrors: string[] = []
    players.forEach((p: any, i: number) => {
      const name = String(p.name ?? p.naam ?? '').trim()
      const ageRaw = p.age ?? p.leeftijd ?? ''
      const ageNum = Number(ageRaw)
      if (!name) validationErrors.push(`Rij ${i + 1}: Naam ontbreekt`)
      if (!Number.isFinite(ageNum) || ageNum < 8 || ageNum > 16) validationErrors.push(`Rij ${i + 1}: Leeftijd ongeldig (verwacht 8-16): ${ageRaw}`)
    })
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join('; ') })
    }

    if (!overwrite) {
      const numbers = players.map((p: any) => normalizeNumber(p.playerNumber ?? p.nummer ?? ''))

      const existing = await Player.find({ sessionId: id, playerNumber: { $in: numbers.filter(n => n) } }).select('playerNumber')
      if (existing.length > 0) {
        const nums = existing.map((e: any) => e.playerNumber)
        return res.status(400).json({ error: `Some players already exist in session: ${nums.join(', ')}` })
      }

      const seenProvided = new Set<string>()
      for (const p of players) {
        const raw = normalizeNumber(p.playerNumber ?? p.nummer ?? '')
        if (raw) {
          if (seenProvided.has(raw)) return res.status(400).json({ error: `Duplicate playerNumber in upload: ${raw}` })
          seenProvided.add(raw)
        }
      }
    } else {
      await Player.deleteMany({ sessionId: id })
    }

    const existingDocs = await Player.find({ sessionId: id }).select('playerNumber').lean()
    const existingSet = new Set<string>(existingDocs.map((d: any) => String(d.playerNumber).padStart(3, '0')))

    const assignedInImport = new Set<string>()
    const MAX_ATTEMPTS = 1000
    const genRandomNumber = () => String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')

    const docs: any[] = []
    for (const p of players) {
      const provided = normalizeNumber(p.playerNumber ?? p.nummer ?? '')
      let finalNumber = provided || ''

      if (!finalNumber || existingSet.has(finalNumber) || assignedInImport.has(finalNumber)) {
        let candidate: string | undefined
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const c = genRandomNumber()
          if (!existingSet.has(c) && !assignedInImport.has(c)) {
            candidate = c
            break
          }
        }

        if (!candidate) {
          return res.status(500).json({ error: `Kon geen uniek spelersnummer genereren voor speler ${p.name || '(onbekend)'}` })
        }
        finalNumber = candidate
      }

      assignedInImport.add(finalNumber)
      existingSet.add(finalNumber)

      docs.push({
        sessionId: id,
        playerNumber: finalNumber,
        nummer: finalNumber,
        name: String(p.name ?? p.naam ?? '').trim(),
        age: Number(p.age ?? p.leeftijd ?? 0),
        category: p.category || 'unknown',
        lastSeen: null,
        highscores: (() => {
          try {
            const incoming: Record<string, number> = {}
            if (p.highscores && typeof p.highscores === 'object') {
              for (const k of Object.keys(p.highscores)) {
                const raw = (p.highscores as Record<string, unknown>)[k]
                const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                if (!Number.isNaN(n)) incoming[k] = Number(n)
              }
            }
            for (const k of Object.keys(p)) {
              const lk = String(k).toLowerCase()
              if (lk.startsWith('score_') || lk.includes('highscore')) {
                const raw = (p as Record<string, unknown>)[k]
                const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                if (!Number.isNaN(n)) incoming[k] = Number(n)
              }
            }
            return incoming
          } catch {
            return {}
          }
        })(),
        score: (() => {
          try {
            let t = 0
            const hs = p.highscores && typeof p.highscores === 'object' ? { ...(p.highscores as Record<string, unknown>) } : {}
            for (const k of Object.keys(p)) {
              const lk = String(k).toLowerCase()
              if (lk.startsWith('score_') || lk.includes('highscore')) {
                hs[k] = (p as Record<string, unknown>)[k]
              }
            }
            for (const k of Object.keys(hs)) {
              try {
                const raw = hs[k]
                const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                if (!Number.isNaN(n)) t += Number(n)
              } catch { /* ignore per-key */ }
            }
            return Number.isNaN(t) ? 0 : t
          } catch { return 0 }
        })(),
      })
    }
    const created: any[] = []
    const errors: string[] = []

    for (let i = 0; i < docs.length; i++) {
      const doc = { ...docs[i] }
      let inserted = null
      let attempts = 0
      while (attempts < MAX_ATTEMPTS) {
        try {
          console.info(`Attempting insert for row ${i + 1} playerNumber=${doc.playerNumber} name=${doc.name}`)
          inserted = await Player.create(doc)
          created.push(inserted)
          console.info(`Inserted row ${i + 1} id=${inserted._id} playerNumber=${inserted.playerNumber}`)
          break
        } catch (e: any) {
          const isDup = e && (e.code === 11000 || (e.codeName && e.codeName === 'DuplicateKey'))
          console.warn(`Insert failed for row ${i + 1} playerNumber=${doc.playerNumber} (attempts=${attempts})`, e && e.message ? e.message : e)
          if (isDup && attempts < MAX_ATTEMPTS) {
            let candidate: string | undefined
            let innerAttempts = 0
            do {
              candidate = genRandomNumber()
              innerAttempts++
              if (innerAttempts > MAX_ATTEMPTS) break
            } while (existingSet.has(candidate) || assignedInImport.has(candidate))

            if (!candidate) {
              errors.push(`Rij ${i + 1}: kon geen uniek spelersnummer genereren na duplicate-key`)
              break
            }
            doc.playerNumber = candidate
            assignedInImport.add(candidate)
            existingSet.add(candidate)
            attempts++
            continue
          }

          console.error(`Failed to insert player at index ${i}:`, e)
          errors.push(`Rij ${i + 1}: ${e && e.message ? e.message : 'Insert error'}`)
          break
        }
      }
    }

    return res.status(201).json({ created, errors })

   } catch (err) {
     console.error('Create players error:', err)
     const msg = err instanceof Error ? err.message : String(err)
     return res.status(500).json({ error: `Failed to create players: ${msg}` })
   }
 })

 router.get('/:id/players', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    const players = await Player.find({ sessionId: id }).sort({ playerNumber: 1 })
    return res.json({ players })
  } catch (err) {
    console.error('List players error:', err)
    return res.status(500).json({ error: 'Failed to list players' })
  }
})

router.put('/:id/players/:playerNumber', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const { player } = req.body
    if (!player) return res.status(400).json({ error: 'player object required in body' })


    const setObj: Record<string, unknown> = {}
    setObj.playerNumber = (player.playerNumber ?? playerNumber)
    setObj.nummer = (player.playerNumber ?? playerNumber)
    if (player.lastSeen) setObj.lastSeen = new Date(player.lastSeen)
    if (typeof player.name !== 'undefined') setObj.name = player.name
    if (typeof player.age !== 'undefined') setObj.age = player.age
    if (typeof player.category !== 'undefined') setObj.category = player.category
    try {
      const incomingHighscores: Record<string, number> = {}
      if (player.highscores && typeof player.highscores === 'object') {
        for (const k of Object.keys(player.highscores)) {
          const raw = (player.highscores as Record<string, unknown>)[k]
          const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
          if (!Number.isNaN(n)) incomingHighscores[k] = Number(n)
        }
      }
      for (const k of Object.keys(player)) {
        const lk = k.toLowerCase()
        if (lk.startsWith('score_') || lk.includes('highscore')) {
          const raw = (player as Record<string, unknown>)[k]
          const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
          if (!Number.isNaN(n)) incomingHighscores[k] = Number(n)
        }
      }

      if (Object.keys(incomingHighscores).length > 0) {
        const existing = await Player.findOne({ sessionId: id, playerNumber }).select('highscores score').lean()
        const merged: Record<string, unknown> = (existing && existing.highscores) ? { ...(existing.highscores as Record<string, unknown>) } : {}
        for (const k of Object.keys(incomingHighscores)) merged[k] = incomingHighscores[k]
        let agg = 0
        for (const k of Object.keys(merged)) {
          const val = merged[k] as unknown
          const n = typeof val === 'number' ? val : (typeof val === 'string' ? Number(val) : NaN)
          if (!Number.isNaN(n)) agg += Number(n)
        }
        setObj.highscores = merged
        setObj.score = agg
      } else if (typeof player.score === 'number') {
        setObj.score = player.score
      }
    } catch (e) {
      if (typeof player.score === 'number') setObj.score = player.score
    }

    const updated = await Player.findOneAndUpdate(
      { sessionId: id, playerNumber },
      { $set: setObj },
      { returnDocument: 'after', runValidators: true }
    )

    if (!updated) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ player: updated })
  } catch (err) {
    console.error('Update player error:', err)
    return res.status(500).json({ error: 'Failed to update player' })
  }
})

router.delete('/:id/players/:playerNumber', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const deleted = await Player.findOneAndDelete({ sessionId: id, playerNumber })
    if (!deleted) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ success: true })
  } catch (err) {
    console.error('Delete player error:', err)
    return res.status(500).json({ error: 'Failed to delete player' })
  }
})



router.get('/:id/leaderboard', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    const docs = await Player.find({ sessionId: id })
      .select('name playerNumber category score highscores')
      .lean()
      .sort({ score: -1 })

    const mapped = (docs || []).map((d: any) => {
      const out: Record<string, any> = {
        name: d && d.name,
        playerNumber: d && d.playerNumber,
        category: d && d.category,
        score: (d && typeof d.score === 'number') ? d.score : 0,
      }
      try {
        if (d && d.highscores && typeof d.highscores === 'object') {
          out.highscores = {}
          for (const k of Object.keys(d.highscores)) {
            try {
              const val = d.highscores[k]
              out.highscores[k] = val
              if (typeof out[k] === 'undefined') out[k] = val
            } catch {
            }
          }
        }
      } catch {

      }

      let total = 0
      const seen = new Set<string>()
      for (const key of Object.keys(out)) {
        try {
          const lk = String(key).toLowerCase()
          if (lk === 'highscores' || lk === 'score') continue
          if (lk.includes('score') || lk.includes('highscore')) {
            const raw = out[key]
            const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
            if (!Number.isNaN(n)) {
              total += Number(n)
              seen.add(lk)
            }
          }
        } catch {
          /* ignore per-key */
        }
      }
      try {
        const hs = out.highscores
        if (hs && typeof hs === 'object') {
          for (const k of Object.keys(hs)) {
            try {
              const lk = String(k).toLowerCase()
              if (seen.has(lk)) continue
              const raw = hs[k]
              const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
              if (!Number.isNaN(n)) {
                total += Number(n)
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore highscores */ }

      out.score = Number.isNaN(total) ? 0 : total
      return out
    })

    mapped.sort((a: any, b: any) => {
      const sa = (a && typeof a.score === 'number') ? a.score : 0
      const sb = (b && typeof b.score === 'number') ? b.score : 0
      if (sa !== sb) return sb - sa
      const na = String(a.name || '').toLowerCase()
      const nb = String(b.name || '').toLowerCase()
      return na.localeCompare(nb)
    })

    return res.json({ leaderboard: mapped })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

router.post('/:id/active-game', async (req, res) => {
  try {
    const { id } = req.params
    const payload = req.body || null
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    session.activeGameInfo = payload
    await session.save()
    return res.json({ success: true, activeGameInfo: session.activeGameInfo })
  } catch (err) {
    console.error('Set activeGameInfo error:', err)
    return res.status(500).json({ error: 'Failed to set active game info' })
  }
})


router.get('/:id/active-game', async (req, res) => {
  try {
    const { id } = req.params
    const session = await Session.findById(id).select('activeGameInfo')
    if (!session) return res.status(404).json({ error: 'Session not found' })
    return res.json({ activeGameInfo: session.activeGameInfo || null })
  } catch (err) {
    console.error('Get activeGameInfo error:', err)
    return res.status(500).json({ error: 'Failed to get active game info' })
  }
})

router.get('/:id/online-players', async (req, res) => {
  try {
    const { id } = req.params

    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const msParam = req.query.cutoffMs ? Number(req.query.cutoffMs) : NaN
    const docs = (Number.isFinite(msParam) && msParam > 0)
      ? await Player.find({ sessionId: id, lastSeen: { $gte: new Date(Date.now() - msParam) } }).select('playerNumber lastSeen').lean()
      : await Player.find({ sessionId: id, lastSeen: { $ne: null } }).select('playerNumber lastSeen').lean()
    const players = (docs || []).map((d: any) => ({ playerNumber: String(d.playerNumber).padStart(3,'0'), lastSeen: d.lastSeen }))
    return res.json({ onlinePlayers: players })
  } catch (err) {
    console.error('Get online players error:', err)
    return res.status(500).json({ error: 'Failed to get online players' })
  }
})

router.post('/:id/players/:playerNumber/online', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })


    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }
    const normalized = normalizeNumber(playerNumber)
    if (!normalized) return res.status(400).json({ error: 'Invalid playerNumber' })


    const now = new Date()
    const updated = await Player.findOneAndUpdate(
      { sessionId: id, playerNumber: normalized, lastSeen: null },
      { lastSeen: now },
      { new: true }
    )
    if (!updated) {
      const exists = await Player.findOne({ sessionId: id, playerNumber: normalized })
      if (!exists) return res.status(404).json({ error: 'Player not found in session' })
      return res.status(409).json({ error: 'Speler is al online op een ander apparaat' })
    }
    return res.json({ success: true, player: updated })
  } catch (err) {
    console.error('Set player online error:', err)
    return res.status(500).json({ error: 'Failed to set player online' })
  }
})

router.post('/:id/players/:playerNumber/offline', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const updated = await Player.findOneAndUpdate(
      { sessionId: id, playerNumber },
      { lastSeen: null },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ success: true })
  } catch (err) {
    console.error('Set player offline error:', err)
    return res.status(500).json({ error: 'Failed to set player offline' })
  }
})

export default router
