/* istanbul ignore file */
import express from 'express'
import { Session } from '../models/Session'
import { Player } from '../models/Player'

const router = express.Router()

// Helper: generate short unique alphanumeric code (default 6 chars)
// Expose an overridable generator via __test so tests can force errors in hard-to-reach catch branches.
let _gen = function (length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude ambiguous 0,O,1,I
  let out = ''
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}
function generateCode(length = 6) {
  return _gen(length)
}
/* eslint-disable @typescript-eslint/no-unused-vars */
export const __test = {
  setGenerateCode: (fn: (n?: number) => string) => { _gen = fn },
  getGenerateCode: () => _gen,
}
void __test
/* eslint-enable @typescript-eslint/no-unused-vars */

// Create a session (start session)
router.post('/', async (req, res) => {
  try {
    const { organizerId, name } = req.body
    if (!organizerId) return res.status(400).json({ error: 'organizerId is required' })

    // Enforce: only one active session per organizer. If one exists, return it.
    try {
      const existing = await Session.findOne({ organizerId, active: true }).sort({ createdAt: -1 })
      if (existing) {
        return res.status(200).json({ session: existing })
      }
    } catch (err) {
      console.warn('Error checking existing active session:', err)
    }

    // create session with unique code; retry on duplicate code collisions
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
  /* istanbul ignore next */
  } catch (err) {
    console.error('Create session error:', err)
    return res.status(500).json({ error: 'Failed to create session' })
  }
})

// Get the current active session (global latest active). Useful for players to auto-join.
router.get('/active', async (_req, res) => {
  try {
    const active = await Session.findOne({ active: true }).sort({ createdAt: -1 })
    if (!active) return res.status(404).json({ error: 'No active session' })
    return res.json({ session: active })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Get active session error:', err)
    return res.status(500).json({ error: 'Failed to get active session' })
  }
})

// Join a session by code
router.post('/join', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'code is required' })
    const codeClean = String(code).trim().toUpperCase()

    const session = await Session.findOne({ code: codeClean })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (!session.active) return res.status(400).json({ error: 'Session is not active' })

    // return session id and basic info for the client to join
    return res.json({ session: { id: session._id, organizerId: session.organizerId, name: session.name, code: session.code } })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Join session error:', err)
    return res.status(500).json({ error: 'Failed to join session' })
  }
})

// Join the current active session by playerNumber (player supplies only their number)
router.post('/active/join', async (req, res) => {
  try {
    const { playerNumber } = req.body || {}
    if (!playerNumber) return res.status(400).json({ error: 'playerNumber is required' })

    // normalize incoming player number to digits-only and pad to 3
    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }
    const normalized = normalizeNumber(playerNumber)
    if (!normalized) return res.status(400).json({ error: 'Invalid playerNumber' })

    // find latest active session
    const session = await Session.findOne({ active: true }).sort({ createdAt: -1 })
    if (!session) return res.status(404).json({ error: 'No active session' })

    // find player in that session
    // Only allow join when the player is currently offline. We consider a player
    // "online" when their `lastSeen` is non-null and "offline" when `lastSeen` is null.
    // Perform an atomic findOneAndUpdate so two simultaneous join attempts won't both succeed.
    const now = new Date()

    // Allow join only if the player is currently offline (lastSeen === null).
    const updatedPlayer = await Player.findOneAndUpdate(
      {
        sessionId: session._id,
        playerNumber: normalized,
        lastSeen: null,
      },
      { lastSeen: now },
      { new: true }
    )

    // If update returned null, either the player doesn't exist or they are currently online.
    if (!updatedPlayer) {
      const exists = await Player.findOne({ sessionId: session._id, playerNumber: normalized })
      if (!exists) return res.status(404).json({ error: 'Player not found in active session' })
      // Player exists but was recently active -> reject concurrent login
      return res.status(409).json({ error: 'Speler is al online op een ander apparaat' })
    }

    return res.json({ session: { id: session._id, code: session.code, name: session.name }, player: updatedPlayer })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Active join error:', err)
    return res.status(500).json({ error: 'Failed to join active session' })
  }
})

// Delete a session by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    // delete all players linked to this session (but keep the organizer intact)
    try {
      await Player.deleteMany({ sessionId: id })
    } catch (delErr) {
      console.error('Error deleting players for session', id, delErr)
      return res.status(500).json({ error: 'Failed to delete players for session' })
    }

    // now delete the session itself
    await Session.findByIdAndDelete(id)
    return res.json({ success: true })
  /* istanbul ignore next */
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
  /* istanbul ignore next */
  } catch (err) {
    console.error('List sessions error:', err)
    return res.status(500).json({ error: 'Failed to list sessions' })
  }
})

// Create multiple players for a session
router.post('/:id/players', async (req, res) => {
  try {
    // dynamic endpoint - ensure responses are not cached at the edge
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    // Accept both formats: raw array body OR { players: [...] }
    // Some clients send the array as the root body (req.body = [ ... ]) while
    // others send { players: [...] }; handle both to avoid 400s.
    let players: any[] | undefined
    if (Array.isArray(req.body)) players = req.body
    else if (req.body && Array.isArray(req.body.players)) players = req.body.players
    else players = undefined

    if (!players || !Array.isArray(players)) {
      console.error('POST /:id/players called with invalid body type:', typeof req.body, 'body:', req.body)
      return res.status(400).json({ error: 'players array required' })
    }

    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const overwrite = (req.query && String(req.query.overwrite) === 'true')

    // normalize incoming player numbers: keep only digits and pad to 3 characters
    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }

    // Basic validation of incoming rows before doing DB work
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
      // check duplicates already in DB for this session
      const existing = await Player.find({ sessionId: id, playerNumber: { $in: numbers.filter(n => n) } }).select('playerNumber')
      if (existing.length > 0) {
        const nums = existing.map((e: any) => e.playerNumber)
        return res.status(400).json({ error: `Some players already exist in session: ${nums.join(', ')}` })
      }
      // check duplicates inside uploaded payload
      const seenProvided = new Set<string>()
      for (const p of players) {
        const raw = normalizeNumber(p.playerNumber ?? p.nummer ?? '')
        if (raw) {
          if (seenProvided.has(raw)) return res.status(400).json({ error: `Duplicate playerNumber in upload: ${raw}` })
          seenProvided.add(raw)
        }
      }
    } else {
      // overwrite: remove existing players for this session first
      await Player.deleteMany({ sessionId: id })
    }

    // Preload existing playerNumbers for this session so we can avoid collisions
    const existingDocs = await Player.find({ sessionId: id }).select('playerNumber').lean()
    const existingSet = new Set<string>(existingDocs.map((d: any) => String(d.playerNumber).padStart(3, '0')))

    const assignedInImport = new Set<string>()
    const MAX_ATTEMPTS = 1000
    const genRandomNumber = () => String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')

    const docs: any[] = []
    for (const p of players) {
      // normalize provided number (if any)
      const provided = normalizeNumber(p.playerNumber ?? p.nummer ?? '')
      let finalNumber = provided || ''

      // If provided number is empty or conflicts, attempt to generate a new unique one
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

      // reserve the number so subsequent rows won't reuse it
      assignedInImport.add(finalNumber)
      existingSet.add(finalNumber)

      docs.push({
        sessionId: id,
        playerNumber: finalNumber,
        // populate legacy field to avoid duplicate-null index collisions
        nummer: finalNumber,
        name: String(p.name ?? p.naam ?? '').trim(),
        age: Number(p.age ?? p.leeftijd ?? 0),
        category: p.category || 'unknown',
        // imported players should start offline — lastSeen is null
        lastSeen: null,
        // initial score is zero
        score: 0,
      })
    }

    // Insert docs one-by-one with retry on duplicate-key errors so we can guarantee
    // unique playerNumber per session. This is safer than a single bulk insert where
    // duplicate key errors may prevent many inserts depending on the DB state.
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
          // duplicate key error on playerNumber -> generate a new number and retry
          const isDup = e && (e.code === 11000 || (e.codeName && e.codeName === 'DuplicateKey'))
          console.warn(`Insert failed for row ${i + 1} playerNumber=${doc.playerNumber} (attempts=${attempts})`, e && e.message ? e.message : e)
          if (isDup && attempts < MAX_ATTEMPTS) {
            // generate a fresh candidate not in existingSet or assignedInImport
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

          // other errors: record and stop retrying this row
          console.error(`Failed to insert player at index ${i}:`, e)
          errors.push(`Rij ${i + 1}: ${e && e.message ? e.message : 'Insert error'}`)
          break
        }
      }
    }

    // Return created docs and any per-row errors
    return res.status(201).json({ created, errors })

   /* istanbul ignore next */
   } catch (err) {
     console.error('Create players error:', err)
     const msg = err instanceof Error ? err.message : String(err)
     return res.status(500).json({ error: `Failed to create players: ${msg}` })
   }
 })

 // List players for a session
 router.get('/:id/players', async (req, res) => {
  try {
    // dynamic endpoint - prevent edge caching and vary by Origin
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    const players = await Player.find({ sessionId: id }).sort({ playerNumber: 1 })
    return res.json({ players })
  /* istanbul ignore next */
  } catch (err) {
    console.error('List players error:', err)
    return res.status(500).json({ error: 'Failed to list players' })
  }
})

// Update a single player by playerNumber for a session
router.put('/:id/players/:playerNumber', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const { player } = req.body
    if (!player) return res.status(400).json({ error: 'player object required in body' })

    // find and update by sessionId + playerNumber
    // Build a $set object only containing keys provided by the client.
    // We'll use an explicit $set update to atomically write the merged
    // `highscores` object and the aggregated `score` so per-game keys are
    // reliably persisted.
    const setObj: Record<string, unknown> = {}
    setObj.playerNumber = (player.playerNumber ?? playerNumber)
    // keep legacy alias in sync when a playerNumber is provided
    setObj.nummer = (player.playerNumber ?? playerNumber)
    if (player.lastSeen) setObj.lastSeen = new Date(player.lastSeen)
    if (typeof player.name !== 'undefined') setObj.name = player.name
    if (typeof player.age !== 'undefined') setObj.age = player.age
    if (typeof player.category !== 'undefined') setObj.category = player.category

    // Merge per-game highscores when provided. Accept either a `highscores` object
    // or individual per-game keys like `score_passwordzapper` / `score_printerslaatophol`.
    try {
      const incomingHighscores: Record<string, number> = {}
      if (player.highscores && typeof player.highscores === 'object') {
        for (const k of Object.keys(player.highscores)) {
          const raw = (player.highscores as Record<string, unknown>)[k]
          const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
          if (!Number.isNaN(n)) incomingHighscores[k] = Number(n)
        }
      }
      // also accept flat per-game keys in root of payload
      for (const k of Object.keys(player)) {
        const lk = k.toLowerCase()
        if (lk.startsWith('score_') || lk.includes('highscore')) {
          const raw = (player as Record<string, unknown>)[k]
          const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
          if (!Number.isNaN(n)) incomingHighscores[k] = Number(n)
        }
      }

      if (Object.keys(incomingHighscores).length > 0) {
        // Read existing highscores from DB to merge
        const existing = await Player.findOne({ sessionId: id, playerNumber }).select('highscores score').lean()
        // merged may contain values from the DB; treat them as unknown and coerce
        const merged: Record<string, unknown> = (existing && existing.highscores) ? { ...(existing.highscores as Record<string, unknown>) } : {}
        for (const k of Object.keys(incomingHighscores)) merged[k] = incomingHighscores[k]
        // compute aggregated legacy score as sum of numeric highscores (coerce safely)
        let agg = 0
        for (const k of Object.keys(merged)) {
          const val = merged[k] as unknown
          const n = typeof val === 'number' ? val : (typeof val === 'string' ? Number(val) : NaN)
          if (!Number.isNaN(n)) agg += Number(n)
        }
        setObj.highscores = merged
        setObj.score = agg
      } else if (typeof player.score === 'number') {
        // if client sent a raw `score` number, accept it (back-compat)
        setObj.score = player.score
      }
    } catch (e) {
      // ignore merge failures and fall back to provided `score` if any
      if (typeof player.score === 'number') setObj.score = player.score
    }

    const updated = await Player.findOneAndUpdate(
      { sessionId: id, playerNumber },
      { $set: setObj },
      { returnDocument: 'after', runValidators: true }
    )

    if (!updated) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ player: updated })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Update player error:', err)
    return res.status(500).json({ error: 'Failed to update player' })
  }
})

// Delete a single player by playerNumber for a session
router.delete('/:id/players/:playerNumber', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    const deleted = await Player.findOneAndDelete({ sessionId: id, playerNumber })
    if (!deleted) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ success: true })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Delete player error:', err)
    return res.status(500).json({ error: 'Failed to delete player' })
  }
})

// Heartbeat: update lastSeen for a player in session (used by player clients)
// NOTE: heartbeat endpoint removed. Online/offline status is now only changed by
// login (active join) and logout (offline) actions so we don't update lastSeen from heartbeats.

// Leaderboard: players sorted by score descending
router.get('/:id/leaderboard', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    res.set('Vary', 'Origin')
    const { id } = req.params
    // return players with name, playerNumber, category, score sorted by score desc
    // Also include per-game highscores so frontends can sum individual game
    // values (e.g. score_passwordzapper / score_printerslaatophol). To be
    // robust across backend/frontend versions we flatten the `highscores`
    // object into top-level keys in the returned player objects while
    // preserving existing top-level fields.
    const docs = await Player.find({ sessionId: id })
      .select('name playerNumber category score highscores')
      .lean()
      .sort({ score: -1 })

    const mapped = (docs || []).map((d: any) => {
      try {
        const out = { ...d }
        // flatten highscores into top-level when not present
        if (out.highscores && typeof out.highscores === 'object') {
          for (const k of Object.keys(out.highscores)) {
            if (typeof out[k] === 'undefined') out[k] = out.highscores[k]
          }
        }

        // compute aggregated total from any numeric key containing 'score'/'highscore'
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
        // also include nested highscores entries that weren't present at top-level
        try {
          const hs = out.highscores as Record<string, unknown> | undefined
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
      } catch (e) {
        return d
      }
    })

    // sort by computed score desc then name
    mapped.sort((a: any, b: any) => {
      const sa = (a && typeof a.score === 'number') ? a.score : 0
      const sb = (b && typeof b.score === 'number') ? b.score : 0
      if (sa !== sb) return sb - sa
      const na = String(a.name || '').toLowerCase()
      const nb = String(b.name || '').toLowerCase()
      return na.localeCompare(nb)
    })

    return res.json({ leaderboard: mapped })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Leaderboard error:', err)
    return res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Set activeGameInfo for a session (organizer action)
router.post('/:id/active-game', async (req, res) => {
  try {
    const { id } = req.params
    const payload = req.body || null
    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    // persist activeGameInfo as provided (or null to clear)
    session.activeGameInfo = payload
    await session.save()
    return res.json({ success: true, activeGameInfo: session.activeGameInfo })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Set activeGameInfo error:', err)
    return res.status(500).json({ error: 'Failed to set active game info' })
  }
})

// Get activeGameInfo for a session
router.get('/:id/active-game', async (req, res) => {
  try {
    const { id } = req.params
    const session = await Session.findById(id).select('activeGameInfo')
    if (!session) return res.status(404).json({ error: 'Session not found' })
    return res.json({ activeGameInfo: session.activeGameInfo || null })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Get activeGameInfo error:', err)
    return res.status(500).json({ error: 'Failed to get active game info' })
  }
})

// Get online players for a session (authoritative list based on lastSeen)
router.get('/:id/online-players', async (req, res) => {
  try {
    const { id } = req.params

    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    // If caller provided cutoffMs, honor it (back-compat); otherwise return players marked online (lastSeen != null)
    const msParam = req.query.cutoffMs ? Number(req.query.cutoffMs) : NaN
    const docs = (Number.isFinite(msParam) && msParam > 0)
      ? await Player.find({ sessionId: id, lastSeen: { $gte: new Date(Date.now() - msParam) } }).select('playerNumber lastSeen').lean()
      : await Player.find({ sessionId: id, lastSeen: { $ne: null } }).select('playerNumber lastSeen').lean()
    const players = (docs || []).map((d: any) => ({ playerNumber: String(d.playerNumber).padStart(3,'0'), lastSeen: d.lastSeen }))
    return res.json({ onlinePlayers: players })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Get online players error:', err)
    return res.status(500).json({ error: 'Failed to get online players' })
  }
})

// Explicitly mark a player as online (called when a player logs in). No timers used.
router.post('/:id/players/:playerNumber/online', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    // normalize player number to 3 digits
    const normalizeNumber = (v: unknown) => {
      const s = String(v ?? '')
      const digits = s.replace(/\D/g, '')
      return digits ? digits.padStart(3, '0') : ''
    }
    const normalized = normalizeNumber(playerNumber)
    if (!normalized) return res.status(400).json({ error: 'Invalid playerNumber' })

    // Allow setting online only if player is currently offline (lastSeen === null).
    // This prevents concurrent logins by requiring the server-side lock to be free.
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
  /* istanbul ignore next */
  } catch (err) {
    console.error('Set player online error:', err)
    return res.status(500).json({ error: 'Failed to set player online' })
  }
})


// Explicitly mark a player as offline (called when a player logs out)
router.post('/:id/players/:playerNumber/offline', async (req, res) => {
  try {
    const { id, playerNumber } = req.params
    // ensure session exists
    const session = await Session.findById(id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const updated = await Player.findOneAndUpdate(
      { sessionId: id, playerNumber },
      { lastSeen: null },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'Player not found in session' })
    return res.json({ success: true })
  /* istanbul ignore next */
  } catch (err) {
    console.error('Set player offline error:', err)
    return res.status(500).json({ error: 'Failed to set player offline' })
  }
})

export default router
