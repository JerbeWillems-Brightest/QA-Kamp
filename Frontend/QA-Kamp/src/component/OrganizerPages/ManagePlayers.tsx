import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { read, utils } from 'xlsx'
import { useAuth } from '../../context/AuthContext'
import { fetchPlayersForSession, addPlayersToSession, updatePlayerInSession, deletePlayerFromSession } from '../../api'

type Player = {
  nummer: string
  naam: string
  leeftijd: number
  category?: string
}

function categorize(leeftijd: number) {
  if (leeftijd >= 8 && leeftijd <= 10) return '8-10'
  if (leeftijd >= 11 && leeftijd <= 13) return '11-13'
  if (leeftijd >= 14 && leeftijd <= 16) return '14-16'
  return 'out-of-range'
}

function normalizeHeader(h: string) {
  return h.toString().toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '')
}

function findValue(row: Record<string, unknown>, candidates: string[], keys: string[]) {
  // try exact header matches (case-insensitive & normalized), then fallback to index positions
  const normalizedMap: Record<string, string> = {}
  for (const k of keys) normalizedMap[normalizeHeader(k)] = k
  for (const c of candidates) {
    const found = normalizedMap[normalizeHeader(c)]
    if (found !== undefined && row[found] !== undefined) return row[found]
  }
  // fallback by index: if candidate position exists in keys array
  // e.g., nummer -> first column, naam -> second, leeftijd -> third
  if (candidates.length && keys.length) {
    // often nummer is column 0, naam 1, leeftijd 2
    // caller can pass a single candidate; we'll return undefined fallback to caller
    return undefined
  }
  return undefined
}

type ManagePlayersProps = {
  onClose?: () => void
}

export default function ManagePlayers({ onClose }: ManagePlayersProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // new states for manual add/edit
  const [nummerInput, setNummerInput] = useState('')
  const [naamInput, setNaamInput] = useState('')
  const [leeftijdInput, setLeeftijdInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null) // nummer of editing player
  const [showAdd, setShowAdd] = useState(false)

   const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL) : ''

   useEffect(() => {
     if (!auth.user) navigate('/organiser-login')
   }, [auth.user, navigate])

  // helper: generate unique 3-digit number between 100-999 not in existing or parsed sets
  function generateUniqueNumber(existing: Set<string>, parsed: Set<string>) {
    const maxAttempts = 1000
    for (let i = 0; i < maxAttempts; i++) {
      const num = Math.floor(Math.random() * 900) + 100 // 100..999
      const s = String(num).padStart(3, '0')
      if (!existing.has(s) && !parsed.has(s)) return s
    }
    throw new Error('Kon geen uniek spelersnummer genereren — te veel spelers')
  }

  // load existing players for current session when component mounts
  useEffect(() => {
     const sessionId = localStorage.getItem('currentSessionId')
     if (!sessionId) return
     let cancelled = false
     ;(async () => {
       setLoading(true)
       try {
         const body = await fetchPlayersForSession(sessionId).catch((e) => { throw e })
         if (cancelled) return
         const playersField = (body as Record<string, unknown>)['players']
         if (Array.isArray(playersField)) {
           const rawPlayers = playersField as unknown
           if (Array.isArray(rawPlayers)) {
             const mapped: Player[] = rawPlayers.map((item) => {
               const p = item as Record<string, unknown>
               const nummerVal = p['nummer'] ?? ''
               const naamVal = p['naam'] ?? p['name'] ?? ''
               const leeftijdVal = p['leeftijd'] ?? p['age'] ?? 0
               const nummer = String(nummerVal ?? '').trim()
               const naam = String(naamVal ?? '').toLowerCase()
               const leeftijd = Number(leeftijdVal ?? 0)
               return { nummer, naam, leeftijd, category: (p['category'] as string) ?? categorize(leeftijd) }
             })
             setPlayers(mapped)
           }
         }
       } catch (err) {
         console.error('Failed to load players', err)
       } finally {
         if (!cancelled) setLoading(false)
       }
     })()
    return () => { cancelled = true }
  }, [API_URL])

  // helper to convert unknown errors to string message
  function toErrorMessage(err: unknown) {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return err
    if (err instanceof Error) return err.message
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }

   const onFile = async (file: File | null, mode: 'append' | 'replace' = 'append') => {
     setErrors([])
     setSuccessMsg(null)
     setPlayers([])
     if (!file) return
     try {
       const data = await file.arrayBuffer()
       const workbook = read(data)
       const sheet = workbook.Sheets[workbook.SheetNames[0]]
       const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

       if (!json || json.length === 0) {
         setErrors(['Leeg sheet of ongeldig bestand'])
         return
       }
       // if we have a session, load existing speler nummers to avoid collisions
       const sessionId = localStorage.getItem('currentSessionId')
       const existingNumbers = new Set<string>()
       if (sessionId) {
         try {
           const existingResp = await fetchPlayersForSession(sessionId)
           const exPlayers = (existingResp && (existingResp as { players?: unknown[] }).players) || []
           for (const p of exPlayers) {
             const pr = p as Record<string, unknown>
             if (pr && typeof pr.nummer === 'string') existingNumbers.add(String(pr.nummer).padStart(3, '0'))
           }
         } catch (err) {
           // if fetching existing fails, log but continue — we'll still generate numbers and hope for no collision
           console.warn('Kon bestaande spelers niet ophalen voor unieke nummer-generatie', err)
         }
       }

       const parsed: Player[] = []
       const errs: string[] = []
       const parsedNumbers = new Set<string>()

       for (let i = 0; i < json.length; i++) {
         const row = json[i]
         const keys = Object.keys(row)

         // prefer headers for name and leeftijd; ignore any nummer column — we auto-generate
         const values = Object.values(row)
         const naamRaw = findValue(row, ['naam', 'name', 'voornaam', 'naamkind'], keys) ?? (keys[0] ? row[keys[0]] : values[0]) ?? ''
         const leeftijdRaw = findValue(row, ['leeftijd', 'age', 'leeftijdkind'], keys) ?? (keys[1] ? row[keys[1]] : values[1]) ?? values[1] ?? values[0] ?? ''

         // generate a unique 3-digit nummer for this imported row
         let nummer: string
         try {
           nummer = generateUniqueNumber(existingNumbers, parsedNumbers)
         } catch {
           errs.push(`Rij ${i + 2}: Kon geen uniek spelersnummer genereren`)
           continue
         }
         parsedNumbers.add(nummer)

         // naam
         const naamVal = String(naamRaw ?? '').trim()
         if (!naamVal) {
           errs.push(`Rij ${i + 2}: Naam ontbreekt`)
           continue
         }
         const naam = naamVal.toLowerCase()

         // leeftijd
         const leeftijdNum = Number(String(leeftijdRaw ?? '').trim())
         if (!Number.isFinite(leeftijdNum) || leeftijdNum < 8 || leeftijdNum > 16) {
           errs.push(`Rij ${i + 2}: Leeftijd "${leeftijdRaw}" is ongeldig — verwacht 8–16`)
           continue
         }
         const leeftijd = Math.floor(leeftijdNum)

         parsed.push({ nummer, naam, leeftijd, category: categorize(leeftijd) })
       }

       // check duplicates in parsed
       const dupMap: Record<string, number[]> = {}
       parsed.forEach((p, idx) => {
         dupMap[p.nummer] = dupMap[p.nummer] || []
         dupMap[p.nummer].push(idx)
       })
       const duplicates = Object.entries(dupMap).filter(([, arr]) => arr.length > 1)
       if (duplicates.length) {
         const msgs = duplicates.map(([num, idxs]) => `Spelersnummer ${num} komt ${idxs.length} keer voor`)
         setErrors(msgs)
         return
       }

       if (errs.length) {
         setErrors(errs)
         return
       }

       // sort and set
       parsed.sort((a, b) => a.nummer.localeCompare(b.nummer))
       setPlayers(parsed)

       // try send to backend (link to current session)
       const sessionId2 = sessionId || localStorage.getItem('currentSessionId')
       if (!sessionId2) {
         setSuccessMsg('Import gelukt (lokaal), maar geen actieve sessie gevonden — players opgeslagen in localStorage')
         localStorage.setItem('importedPlayers', JSON.stringify(parsed))
         return
       }

       try {
         const resp = await addPlayersToSession(sessionId2, parsed, mode === 'replace')
         // normalize created count if returned
         type RespCreated = { created?: unknown }
         const rc = (resp && typeof resp === 'object') ? (resp as RespCreated).created : undefined
         const createdCount = Array.isArray(rc) ? rc.length : parsed.length
         setSuccessMsg(`Spelers succesvol toegevoegd (${createdCount})`)
         localStorage.setItem('importedPlayers', JSON.stringify(parsed))
         setPlayers(parsed)
       } catch (err: unknown) {
         console.error('Network error posting players', err)
         setErrors([toErrorMessage(err)])
       }
     } catch (err) {
       console.error(err)
       setErrors(['Kon bestand niet inlezen of ongeldig formaat'])
     }
   }

  // file picker handler
  const handlePick = (mode: 'append' | 'replace') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx, .xls, .csv'
    input.onchange = () => {
      const f = input.files && input.files[0]
      onFile(f ?? null, mode)
    }
    input.click()
  }

  // Auto-generate a unique spelersnummer and open the add form
  const handleAddClick = async () => {
    // if currently editing, just toggle the add form
    if (editing) {
      setShowAdd(s => !s)
      return
    }

    // if already open and no editing, close it
    if (showAdd) {
      setShowAdd(false)
      return
    }

    setErrors([])
    setSuccessMsg(null)

    // Build existing numbers from local players
    const existingNumbers = new Set<string>(players.map(p => String(p.nummer).padStart(3, '0')))

    // Also try to fetch existing numbers from backend for the active session if present
    const sessionId = localStorage.getItem('currentSessionId')
    if (sessionId) {
      try {
        const existingResp = await fetchPlayersForSession(sessionId)
        const exPlayers = (existingResp && (existingResp as { players?: unknown[] }).players) || []
        for (const p of exPlayers) {
          const pr = p as Record<string, unknown>
          if (pr && pr['nummer']) existingNumbers.add(String(pr['nummer']).padStart(3, '0'))
        }
      } catch (err) {
        // If fetching fails, we still proceed with local numbers; don't block the user
        console.warn('Kon bestaande spelers niet ophalen voor uniek nummer (handmatig toevoegen)', err)
      }
    }

    // Try to generate a unique number
    try {
      const generated = generateUniqueNumber(existingNumbers, new Set<string>())
      setNummerInput(generated)
      setNaamInput('')
      setLeeftijdInput('')
      setEditing(null)
      setShowAdd(true)
    } catch (err) {
      console.error('Kon geen uniek nummers genereren', err)
      setErrors(['Kon geen uniek spelersnummer genereren, voeg er handmatig één toe'])
      // still show the form so user can input manually
      setNummerInput('')
      setNaamInput('')
      setLeeftijdInput('')
      setShowAdd(true)
    }
  }

  // helper: add or update single player
  async function submitPlayer() {
    setErrors([])
    setSuccessMsg(null)
    const sess = localStorage.getItem('currentSessionId')
    if (!sess) {
      setErrors(['Geen actieve sessie gevonden'])
      return
    }

    // validation
    const numOnly = String(nummerInput || '').trim().replace(/\D/g, '')
    if (!numOnly) return setErrors(['Ongeldig spelersnummer'])
    const nummer = numOnly.padStart(3, '0')
    const naam = String(naamInput || '').trim().toLowerCase()
    if (!naam) return setErrors(['Naam is verplicht'])
    const leeftijdNum = Number(String(leeftijdInput || '').trim())
    if (!Number.isFinite(leeftijdNum) || leeftijdNum < 8 || leeftijdNum > 16) return setErrors(['Leeftijd moet een getal tussen 8 en 16 zijn'])
    const leeftijd = Math.floor(leeftijdNum)
    const player: Player = { nummer, naam, leeftijd, category: categorize(leeftijd) }

    // ensure the nummer is unique (check local state + backend session)
    try {
      const existingNumbers = new Set<string>(players.map(p => String(p.nummer).padStart(3, '0')))
      // fetch backend players to be extra safe
      try {
        const existingResp = await fetchPlayersForSession(sess)
        const exPlayers = (existingResp && (existingResp as { players?: unknown[] }).players) || []
        for (const p of exPlayers) {
          const pr = p as Record<string, unknown>
          if (pr && pr['nummer']) existingNumbers.add(String(pr['nummer']).padStart(3, '0'))
        }
      } catch (err) {
        // fetching failed — still proceed with local checks, but warn
        console.warn('Kon bestaande spelers niet ophalen voor validatie', err)
      }

      // If editing, allow keeping the same nummer; when changing, ensure not colliding with other players
      if (editing) {
        if (nummer !== editing && existingNumbers.has(nummer)) {
          setErrors([`Spelersnummer ${nummer} bestaat al`])
          return
        }
      } else {
        // adding new player
        if (existingNumbers.has(nummer)) {
          setErrors([`Spelersnummer ${nummer} bestaat al`])
          return
        }
      }
    } catch (err) {
      console.error('Fout bij validatie van spelersnummer', err)
      setErrors(['Fout bij validatie van spelersnummer'])
      return
    }

    try {
      if (editing) {
        // update via helper
        await updatePlayerInSession(sess, editing, player)
        setPlayers((prev) => prev.map((p) => p.nummer === editing ? player : p).sort((a, b) => a.nummer.localeCompare(b.nummer)))
        setSuccessMsg('Speler bijgewerkt')
        setEditing(null)
        setShowAdd(false)
      } else {
        // add using addPlayersToSession with single element
        await addPlayersToSession(sess, [player], false)
        setPlayers((prev) => {
          const next = [...prev.filter(p => p.nummer !== nummer), player]
          next.sort((a, b) => a.nummer.localeCompare(b.nummer))
          return next
        })
        setSuccessMsg('Speler toegevoegd')
        setShowAdd(false)
      }
     // clear inputs
      setNummerInput('')
      setNaamInput('')
      setLeeftijdInput('')
   } catch (err: unknown) {
     console.error('Network error in submitPlayer', err)
     setErrors([toErrorMessage(err) || 'Netwerkfout bij toevoegen/bijwerken speler'])
   }
  }

  const startEdit = (p: Player) => {
    setEditing(p.nummer)
    setNummerInput(p.nummer)
    setNaamInput(p.naam)
    setLeeftijdInput(String(p.leeftijd))
    setShowAdd(true)
  }

  function cancelEdit() {
    setEditing(null)
    setNummerInput('')
    setNaamInput('')
    setLeeftijdInput('')
    setShowAdd(false)
  }

  const deletePlayer = async (nummerToDelete: string) => {
    setErrors([])
    setSuccessMsg(null)
    const sess = localStorage.getItem('currentSessionId')
    if (!sess) return setErrors(['Geen actieve sessie gevonden'])
    try {
      await deletePlayerFromSession(sess, nummerToDelete)
      setPlayers((prev) => prev.filter((p) => p.nummer !== nummerToDelete))
      setSuccessMsg('Speler verwijderd')
    } catch (err: unknown) {
      console.error('Network error deleting player', err)
      setErrors([toErrorMessage(err) || 'Netwerkfout bij verwijderen speler'])
    }
  }

  return (
    <main onClick={(e) => e.stopPropagation()} style={{ padding: 20, fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', justifyContent: 'center' }}>
     <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', position: 'relative' }}>
        {/* close button inside the ManagePlayers panel */}
        {onClose && (
          <button
            aria-label="Sluit"
            onClick={() => onClose()}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              background: 'transparent',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Spelers beheren</h2>
            <p style={{ margin: 0, color: '#555' }}>{players.length > 0 ? `Huidige spelers: ${players.length}` : 'Huidige spelers: 0'}</p>
          </div>
        </header>

        {/* Always show import / toevoegen buttons (but hide import if players exist) */}
        <div style={{ margin: '12px 0', display: 'flex', gap: 12, justifyContent: 'center' }}>
          {players.length === 0 && (
            <button onClick={() => handlePick('replace')} style={{  fontSize: 18, padding: '10px 14px', borderRadius: 8, background: '#f2c200', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Importeer (vervang)">
              {/* download-arrow icon (white) */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 3v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12l7 7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3" y="19" width="18" height="2" rx="1" fill="#fff" />
              </svg>
               Spelers importeren
            </button>
          )}

          <button onClick={handleAddClick} style={{ fontSize: 18, padding: '10px 14px', borderRadius: 8, background: '#f2c200', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Toevoegen (append)">
            {/* plus icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Spelers toevoegen
          </button>
        </div>

        {errors.length > 0 && (
          <div style={{ color: '#b00020', marginBottom: 12 }}>
            <h3 style={{ margin: '8px 0' }}>Validatie fouten</h3>
            <ul>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {successMsg && (
          <div style={{ color: '#166534', marginBottom: 12 }}>
            <strong>{successMsg}</strong>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Laden...</div>
        ) : players.length > 0 ? (
          <div>
            {/* Table container: show approx first 3 rows and allow vertical scroll for the rest */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ maxHeight: 3 * 56, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7f7f7' }}>
                      <th style={{ textAlign: 'left', padding: 10 }}>Spelersnummer</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Naam</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Categorie</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Update/Verwijder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, idx) => (
                      <tr key={p.nummer} style={{ background: idx % 2 === 0 ? '#fff' : '#fbfbfb' }}>
                        <td style={{ padding: 10 }}>{p.nummer}</td>
                        <td style={{ padding: 10 }}>{p.naam}</td>
                        <td style={{ padding: 10 }}>{p.category}</td>
                        <td style={{ padding: 10 }}>
                          <button onClick={() => startEdit(p)} title="Bewerk" style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginRight: 8 }}>
                            {/* improved pencil icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#111" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="#111" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </button>
                          <button onClick={() => deletePlayer(p.nummer)} title="Verwijder" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                            {/* improved trash icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M3 6h18" stroke="#b00020" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#b00020" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              <path d="M10 11v6M14 11v6" stroke="#b00020" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#b00020" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual add/edit form shown when showAdd is true */}
            {showAdd && (
              <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
                    <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Spelersnummer</label>
                    <input value={nummerInput} onChange={(e) => setNummerInput(e.target.value)} placeholder="001" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
                    <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Naam</label>
                    <input value={naamInput} onChange={(e) => setNaamInput(e.target.value)} placeholder="naam" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                    <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Leeftijd</label>
                    <input value={leeftijdInput} onChange={(e) => setLeeftijdInput(e.target.value)} placeholder="10" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => submitPlayer()} style={{ background: '#f2c200', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>{editing ? 'Bijwerken' : 'Opslaan'}</button>
                    <button onClick={() => cancelEdit()} style={{ background: '#fff', color: '#111', border: '1px solid #ddd', padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Annuleren</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ padding: 20, color: '#666' }}>Klik op de knop om een Excel/CSV-bestand te importeren (nummer, naam, leeftijd).</div>
        )}

        {/* If no players but manual add requested, show form below message too */}
        {players.length === 0 && showAdd && (
          <div style={{ marginTop: 12 }}>
            <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
                  <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Spelersnummer</label>
                  <input value={nummerInput} onChange={(e) => setNummerInput(e.target.value)} placeholder="001" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
                  <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Naam</label>
                  <input value={naamInput} onChange={(e) => setNaamInput(e.target.value)} placeholder="naam" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                  <label style={{ fontSize: 13, marginBottom: 6, textAlign: 'left' }}>Leeftijd</label>
                  <input value={leeftijdInput} onChange={(e) => setLeeftijdInput(e.target.value)} placeholder="10" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => submitPlayer()} style={{ background: '#f2c200', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>{editing ? 'Bijwerken' : 'Opslaan'}</button>
                  <button onClick={() => cancelEdit()} style={{ background: '#fff', color: '#111', border: '1px solid #ddd', padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Annuleren</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
