import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { read, utils } from 'xlsx'
import { useAuth } from '../../context/AuthContext'

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

   const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL) : ''

   useEffect(() => {
     if (!auth.user) navigate('/organiser-login')
   }, [auth.user, navigate])

  // load existing players for current session when component mounts
  useEffect(() => {
     const sessionId = localStorage.getItem('currentSessionId')
     if (!sessionId) return
     let cancelled = false
     ;(async () => {
       setLoading(true)
       try {
         const base = API_URL ? API_URL.replace(/\/$/, '') : ''
         const url = base ? `${base}/api/sessions/${sessionId}/players` : `/api/sessions/${sessionId}/players`
         const res = await fetch(url)
         if (!res.ok) return
         const body = await res.json().catch(() => null)
         if (cancelled) return
        if (body) {
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
        }
       } catch (err) {
         console.error('Failed to load players', err)
       } finally {
         if (!cancelled) setLoading(false)
       }
     })()
    return () => { cancelled = true }
  }, [API_URL])

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

      const parsed: Player[] = []
      const errs: string[] = []

      for (let i = 0; i < json.length; i++) {
        const row = json[i]
        const keys = Object.keys(row)

        // prefer headers: nummer, name, leeftijd (support many variants)
        // fallback: if headers are missing or weird, use Object.values order
        const values = Object.values(row)
        const nummerRaw = findValue(row, ['nummer', 'spelersnummer', 'playernumber', 'nummer_speler', 'id', 'number'], keys) ?? (keys[0] ? row[keys[0]] : values[0]) ?? ''
        const naamRaw = findValue(row, ['naam', 'name', 'voornaam', 'naamkind'], keys) ?? (keys[1] ? row[keys[1]] : values[1]) ?? values[0] ?? ''
        const leeftijdRaw = findValue(row, ['leeftijd', 'age', 'leeftijdkind'], keys) ?? (keys[2] ? row[keys[2]] : values[2]) ?? values[2] ?? ''

        // normalize nummer: accept numeric or string, remove decimals, pad to 3
        let nummerStr = String(nummerRaw ?? '').trim()
        // if number like 1 => '1' -> pad to '001'
        if (nummerStr === '') {
          errs.push(`Rij ${i + 2}: Spelersnummer ontbreekt`)
          continue
        }
        // handle Excel numeric style (e.g., 1 -> '1' or '1.0'), remove decimal .0
        if (/^\d+(?:\.0+)?$/.test(nummerStr)) {
          nummerStr = nummerStr.split('.')[0]
        }
        // remove non-digits
        const onlyDigits = nummerStr.replace(/\D/g, '')
        if (onlyDigits.length === 0) {
          errs.push(`Rij ${i + 2}: Ongeldig spelersnummer "${nummerStr}"`)
          continue
        }
        const nummer = onlyDigits.padStart(3, '0')

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
      const sessionId = localStorage.getItem('currentSessionId')
      if (!sessionId) {
        setSuccessMsg('Import gelukt (lokaal), maar geen actieve sessie gevonden — players opgeslagen in localStorage')
        localStorage.setItem('importedPlayers', JSON.stringify(parsed))
        return
      }

      try {
        // if mode === 'replace', request backend to overwrite existing players for this session
        const base = (API_URL && API_URL.length > 0) ? API_URL.replace(/\/$/, '') : ''
        const overwriteQuery = mode === 'replace' ? '?overwrite=true' : ''
        const url = base ? `${base}/api/sessions/${sessionId}/players${overwriteQuery}` : `/api/sessions/${sessionId}/players${overwriteQuery}`
         const res = await fetch(url, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ players: parsed })
         })
         if (!res.ok) {
           // try parse JSON error body safely
           let body: Record<string, unknown> | null = null
           const ct = res.headers.get('content-type') || ''
           if (ct.includes('application/json')) {
             try {
               const parsed = await res.json()
               if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
             } catch {
               body = null
             }
           }
           const msg = body && 'error' in body && typeof body.error === 'string' ? String(body.error) : res.statusText || `HTTP ${res.status}`
           setErrors([`Backend error: ${msg}`])
           return
         }
         // success: try read JSON only if available
        let createdCount = parsed.length
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          try {
            const parsedBody = await res.json()
            if (parsedBody && typeof parsedBody === 'object' && 'created' in (parsedBody as Record<string, unknown>)) {
              const pb = parsedBody as Record<string, unknown>
              if (Array.isArray(pb.created)) createdCount = pb.created.length
            }
          } catch {
            // ignore parse errors
          }
        }
        setSuccessMsg(`Spelers succesvol toegevoegd (${createdCount})`)
        localStorage.setItem('importedPlayers', JSON.stringify(parsed))
        // update local list to reflect the change
        setPlayers(parsed)
       } catch (err) {
         console.error('Network error posting players', err)
         setErrors(['Kon spelers niet naar server sturen (network)'])
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

        {players.length === 0 && (
          <div style={{ margin: '12px 0', display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => handlePick('replace')} style={{  fontSize: 18, padding: '10px 14px', borderRadius: 8, background: '#f2c200', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Importeer (vervang)">
              {/* download-arrow icon (white) */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 3v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12l7 7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3" y="19" width="18" height="2" rx="1" fill="#fff" />
              </svg>
               Spelers importeren
             </button>

            <button onClick={() => handlePick('append')} style={{ fontSize: 18, padding: '10px 14px', borderRadius: 8, background: '#f2c200', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Toevoegen (append)">
              {/* plus icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Spelers toevoegen
            </button>
          </div>
        )}

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
                      <th style={{ textAlign: 'left', padding: 10 }}>Leeftijd</th>
                      <th style={{ textAlign: 'left', padding: 10 }}>Categorie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, idx) => (
                      <tr key={p.nummer} style={{ background: idx % 2 === 0 ? '#fff' : '#fbfbfb' }}>
                        <td style={{ padding: 10 }}>{p.nummer}</td>
                        <td style={{ padding: 10 }}>{p.naam}</td>
                        <td style={{ padding: 10 }}>{p.leeftijd}</td>
                        <td style={{ padding: 10 }}>{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 20, color: '#666' }}>Klik op de knop om een Excel/CSV-bestand te importeren (nummer, naam, leeftijd).</div>
        )}

      </div>
    </main>
  )
}
