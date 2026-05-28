import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import fireworksSound from '../../../assets/sounds/Fireworks.mp3'
import fightTheBugMusic from '../../../assets/FightTheBug/FightTheBugMusic.mp3'
import correctFightTheBug from '../../../assets/FightTheBug/CorrectFightTheBug.mp3'
import wrongFightTheBug from '../../../assets/FightTheBug/WrongFightTheBug.mp3'
import { createPortal } from 'react-dom'
import BeatenBugImg from '../../../assets/FightTheBug/BeatenBug.png'
import WrongAnswerBugImg from '../../../assets/FightTheBug/WrongAwnserBug.png'
import DefaultBugImg from '../../../assets/FightTheBug/DefaultBug.png'
import TakingDamageBugImg from '../../../assets/FightTheBug/TakingDamageBug.png'
import './FightTheBug.css'
import '../PasswordZapper/PasswordZapperGame.css'

// Highscore helper (inlined so this file is self-contained like other games)
const API_BASE = (typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE : undefined) || '/api'

type HighscorePayload = { game: string; player: string; score: number; [k: string]: unknown }
const PENDING_KEY = 'pz_pending_highscores'

async function sendHighscore(game: string, player: string, score: number, extra: Record<string, unknown> = {}) {
  const payload: HighscorePayload = { game, player, score, ...extra }
  try {
    const res = await fetch(`${API_BASE}/highscores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Highscore POST failed: ${res.status} ${text}`)
    }
    return await res.json()
  } catch (err) {
    try {
      const cur = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as Array<Record<string, unknown>>
      cur.push({ payload, ts: Date.now() })
      localStorage.setItem(PENDING_KEY, JSON.stringify(cur))
    } catch { /* ignore */ }
    throw err
  }
}

async function retryPendingHighscores(): Promise<void> {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as Array<{ payload: HighscorePayload }>
    if (!pending || pending.length === 0) return
    const remaining: Array<typeof pending[0]> = []
    for (const item of pending) {
      try {
        await sendHighscore(item.payload.game, item.payload.player, item.payload.score, Object.assign({}, item.payload))
      } catch {
        remaining.push(item)
      }
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify(remaining))
  } catch {
    // ignore
  }
}

type AgeGroup = '8-10' | '11-13' | '14-16'
type EndResults = { score: number; timeMs: number; mistakes: number }

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: EndResults) => void
}

type Question = {
  id: string
  prompt: string
  options: { id: string; label: string; icon?: string }[]
  correctOptionId: string
  hintLinesByAge?: Partial<Record<AgeGroup, string[]>>
}

function inferAgeGroup(value?: string | null): AgeGroup {
  const raw = String(value || '').toLowerCase()
  try {
    if (/8\D*10/.test(raw)) return '8-10'
    if (/11\D*13/.test(raw)) return '11-13'
    if (/14\D*16/.test(raw)) return '14-16'
    const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
    if (nums.length >= 1) {
      const n = nums[0]
      if (n <= 10) return '8-10'
      if (n <= 13) return '11-13'
      return '14-16'
    }
    if (raw.includes('8')) return '8-10'
    if (raw.includes('11') || raw.includes('12') || raw.includes('13')) return '11-13'
    if (raw.includes('14') || raw.includes('15') || raw.includes('16')) return '14-16'
  } catch {
    /* fall through */
  }
  return '11-13'
}

const MISTAKES_HINT_THRESHOLD: Record<AgeGroup, number> = {
  '8-10': 1,
  '11-13': 2,
  '14-16': 3
}

const INTRO_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord of voer de juiste actie uit.',
    'Bij een juist antwoord verliest de Bug energie.',
    'Maak je een fout? Dan verlies jij energie.',
    'Versla de Bug door zoveel mogelijk juiste antwoorden te geven!'
  ],
  '11-13': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord of voer de juiste actie uit.',
    'Bij een juist antwoord verliest de Bug energie.',
    'Maak je een fout? Dan verlies jij energie.',
    'Versla de Bug door 10 correcte antwoorden te geven.'
  ],
  '14-16': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord (soms met pseudocode).',
    'Juist = Bug -10 energie, fout = Jij -10 energie.',
    'Versla de Bug door 10 correcte antwoorden te geven.'
  ]
}

function computePercent(correct: number, wrong: number) {
  const total = correct + wrong
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)))
}

function computeStars(percent: number) {
  const pct = Math.max(0, Math.min(100, percent))
  // Mapping per user's request (explicit buckets):
  // 0 - 32  => 0 stars
  // 33 - 66 => 1 star
  // 67 - 99 => 2 stars
  // 100     => 3 stars
  if (pct <= 32) return 0
  if (pct <= 66) return 1
  if (pct <= 99) return 2
  return 3
}

function randFrom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

const POSITIVE_FEEDBACK = ['Goed zo!', 'Top!', 'Correct!', 'Sterk!', 'Mooi zo!']
const NEGATIVE_FEEDBACK = ['Fout! Dit antwoord was zwak.', 'Fout!', 'Helaas, probeer opnieuw.']

function pickNext<T extends { id: string }>(pool: T[], lastId?: string) {
  if (pool.length <= 1) return pool[0]
  for (let i = 0; i < 8; i++) {
    const q = pool[Math.floor(Math.random() * pool.length)]
    if (q.id !== lastId) return q
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

// Pick a question that has not been used yet in the current run. If all
// questions have been used, clear the used set and allow reuse (so games with
// fewer questions than required still continue). Avoid immediate repeat when
// possible.
function pickUnusedQuestion<T extends { id: string }>(pool: T[], usedSet: Set<string>, lastId?: string) {
  if (pool.length <= 1) return pool[0]
  let candidates = pool.filter((p) => !usedSet.has(p.id))
  if (candidates.length === 0) {
    // all used -> reset and allow reuse
    usedSet.clear()
    candidates = pool.slice()
  }
  if (candidates.length > 1 && lastId) {
    const filtered = candidates.filter((p) => p.id !== lastId)
    if (filtered.length > 0) candidates = filtered
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  usedSet.add(pick.id)
  return pick
}

function buildQuestionPool(age: AgeGroup): Question[] {
  if (age === '8-10') {
    return [
      {
        id: 'q1',
        prompt: 'Waarom is een wachtwoord geheim?',
        options: [
          { id: 'a', label: 'Zodat iedereen het weet' },
          { id: 'b', label: 'Omdat het zo moet' },
          { id: 'c', label: 'Zodat ik kan inloggen' },
          { id: 'd', label: 'Zodat niemand in je account kan' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '8-10': ['Een wachtwoord is privé.', 'Deel het nooit met anderen.'] }
      },
      {
        id: 'q2',
        prompt: 'Wat gebeurt er als iemand je wachtwoord kent?',
        options: [
          { id: 'a', label: 'Je account wordt automatisch geblokkeerd' },
          { id: 'b', label: 'Ze kunnen je account gebruiken' },
          { id: 'c', label: 'Je ontvangt een waarschuwingsmail' },
          { id: 'd', label: 'Er verandert niets zolang jij ook ingelogd bent' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '8-10': ['Als iemand je wachtwoord weet, kan die persoon doen alsof die jij bent.', 'Bescherm je wachtwoord dus goed.'] }
      },
      {
        id: 'q3',
        prompt: 'Je krijgt een vreemde mail. Wat doe je?',
        options: [
          { id: 'a', label: 'Doorsturen naar vrienden om te vragen wat zij denken' },
          { id: 'b', label: 'Meteen antwoorden zodat het probleem stopt' },
          { id: 'c', label: 'De mail negeren en niet klikken' },
          { id: 'd', label: 'Alles doen wat in de mail gevraagd wordt' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '8-10': ['Klik niet op linkjes in verdachte mails.', 'Vraag hulp aan een volwassene als je twijfelt.'] }
      },
      {
        id: 'q4',
        prompt: 'Waarom zijn sommige mails gevaarlijk?',
        options: [
          { id: 'a', label: 'Ze proberen je te misleiden' },
          { id: 'b', label: 'Ze nemen te veel opslagruimte in' },
          { id: 'c', label: 'Ze vertragen je internetverbinding' },
          { id: 'd', label: 'Ze worden automatisch doorgestuurd naar anderen' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '8-10': ['Sommige mails doen alsof ze van een bekende zijn.', 'Ze willen dat je iets doet wat niet goed is.'] }
      },
      {
        id: 'q5',
        prompt: 'Wat doet phishing?',
        options: [
          { id: 'a', label: 'Je computer traag maken' },
          { id: 'b', label: 'De website trager maken' },
          { id: 'c', label: 'Gegevens stelen' },
          { id: 'd', label: 'Bugs vinden' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '8-10': ['Phishing probeert jouw gegevens te stelen.', 'Wees voorzichtig met wat je invoert.'] }
      },
      {
        id: 'q6',
        prompt: 'Waarom klik je niet op elke link?',
        options: [
          { id: 'a', label: 'Sommige links gebruiken te veel internet' },
          { id: 'b', label: 'Sommige links kunnen je naar een gevaarlijke website sturen' },
          { id: 'c', label: 'Sommige links werken alleen op computers' },
          { id: 'd', label: 'Sommige links veranderen de kleuren van je scherm' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '8-10': ['Niet alle linkjes zijn veilig.', 'Controleer eerst wie het stuurde.'] }
      },
      {
        id: 'q7',
        prompt: 'Wat gebeurt er als veel mensen tegelijk op een website zitten?',
        options: [
          { id: 'a', label: 'De website wordt sneller' },
          { id: 'b', label: 'De website wordt verwijdert' },
          { id: 'c', label: 'De website gaat weg' },
          { id: 'd', label: 'De website wordt trager' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '8-10': ['Veel bezoekers kunnen de site langzamer maken.', 'Dat noemen we verkeer of drukte op de website.'] }
      },
      {
        id: 'q8',
        prompt: 'Waarom kan een website traag worden?',
        options: [
          { id: 'a', label: 'Te weinig mensen' },
          { id: 'b', label: 'Te veel fotos' },
          { id: 'c', label: 'Te veel mensen tegelijk' },
          { id: 'd', label: 'Te veel bugs' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '8-10': ['Te veel bezoekers of veel content kan vertraging veroorzaken.', 'Soms helpt het om even te wachten en opnieuw te laden.'] }
      },
      {
        id: 'q9',
        prompt: 'Waarom moeten websites getest worden?',
        options: [
          { id: 'a', label: 'Om bugs te vinden' },
          { id: 'b', label: 'Om de website sneller te maken' },
          { id: 'c', label: 'Om Fishing te voorkomen' },
          { id: 'd', label: 'Om hackers te vinden' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '8-10': ['Testen helpt om fouten te vinden.', 'Zo wordt de site beter en veiliger.'] }
      },
      {
        id: 'q10',
        prompt: 'Wat is een bug?',
        options: [
          { id: 'a', label: 'Een misleidende mail' },
          { id: 'b', label: 'Een fout in een website' },
          { id: 'c', label: 'Een trage website' },
          { id: 'd', label: 'Een hacker op een website' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '8-10': ['Een bug is een fout in de website.', 'Testers zoeken deze fouten op.'] }
      },
      {
        id: 'q11',
        prompt: 'Waarom zijn kleine details belangrijk?',
        options: [
          { id: 'a', label: 'Kleine fouten maken geen verschil' },
          { id: 'b', label: 'Details zijn alleen belangrijk voor het design' },
          { id: 'c', label: 'Details zorgen alleen voor meer snelheid' },
          { id: 'd', label: 'Kleine fouten kunnen grotere problemen veroorzaken' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '8-10': ['Let goed op ook op kleine dingen.', 'Soms veroorzaakt een klein foutje veel gedoe.'] }
      },
      {
        id: 'q12',
        prompt: 'Waarom moet je goed opletten bij testen?',
        options: [
          { id: 'a', label: 'Om sneller te zijn' },
          { id: 'b', label: 'Om bugs te verwijderen' },
          { id: 'c', label: 'Om bugs te vinden' },
          { id: 'd', label: 'Om phishing te zien' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '8-10': ['Tester zijn betekent goed kijken.', 'Zo vind je fouten voordat anderen dat doen.'] }
      },
      {
        id: 'q13',
        prompt: 'Wat doet een tester?',
        options: [
          { id: 'a', label: 'Controleren of alles werkt' },
          { id: 'b', label: 'Websites maken' },
          { id: 'c', label: 'Websites kapot maken' },
          { id: 'd', label: 'Bugs oplossen' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '8-10': ['Een tester kijkt of alles goed werkt.', 'Ze helpen fouten te vinden zodat het beter wordt.'] }
      }
    ]
  }

  if (age === '11-13') {
    return [
      {
        id: 'q1',
        prompt: 'Een sterk wachtwoord bevat ...?',
        options: [
          { id: 'a', label: '1 woorden + 1 cijfer' },
          { id: 'b', label: '2 woorden + 1 cijfer + 1 teken + hoofdletters' },
          { id: 'c', label: '2 woorden + 1 cijfer + 1 teken' },
          { id: 'd', label: '1 woorden + 1 cijfer + 1 teken + hoofdletters' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Lang + mix van tekens is sterk.', 'Gebruik hoofdletters en symbolen.'] }
      },
      {
        id: 'q2',
        prompt: 'Hetzelfde wachtwoord overal gebruiken is ...?',
        options: [
          { id: 'a', label: 'Veilig' },
          { id: 'b', label: 'Beter' },
          { id: 'c', label: 'Gemakkelijk' },
          { id: 'd', label: 'Gevaarlijk' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '11-13': ['Hergebruik maakt meerdere accounts kwetsbaar.', 'Gebruik unieke wachtwoorden of een manager.'] }
      },
      {
        id: 'q3',
        prompt: 'Hoe herken je een phishingmail?',
        options: [
          { id: 'a', label: 'Aan het professionele uiterlijk en de officiële logo\'s' },
          { id: 'b', label: 'Aan het feit dat de mail in je spammap terechtkomt' },
          { id: 'c', label: 'Aan spelfouten, een verdacht e-mailadres of een dringende toon' },
          { id: 'd', label: 'Aan het ontbreken van afbeeldingen in de mail' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '11-13': ['Let op spelfouten en een dringende toon.', 'Controleer het afzenderadres en links.'] }
      },
      {
        id: 'q4',
        prompt: 'Wat is een load test?',
        options: [
          { id: 'a', label: 'Testen of veel spelers tegelijk kunnen op de website kunnen' },
          { id: 'b', label: 'Het design van een website testen' },
          { id: 'c', label: 'De veiligheid van een website testen' },
          { id: 'd', label: 'Het geluid van een website testen' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '11-13': ['Een load test kijkt of de site veel gebruikers aan kan.', 'Het helpt servers voor te bereiden op drukte.'] }
      },
      {
        id: 'q5',
        prompt: 'Wat kan er gebeuren als te veel mensen tegelijk een website gebruiken?',
        options: [
          { id: 'a', label: 'De website wordt sneller' },
          { id: 'b', label: 'De website crasht of wordt trager' },
          { id: 'c', label: 'De website gaat weg' },
          { id: 'd', label: 'De website wordt verwijdert' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Te veel bezoekers kan de site traag maken of laten crashen.', 'Schaal servers om dit te voorkomen.'] }
      },
      {
        id: 'q6',
        prompt: 'Waarom worden bugs opgelost?',
        options: [
          { id: 'a', label: 'Om phishing te voorkomen' },
          { id: 'b', label: 'Voor minder mensen tegelijk op de website te laten gaan' },
          { id: 'c', label: 'Voor meer mensen tegelijk op de website te laten gaan' },
          { id: 'd', label: 'Om de werking van de website te verbeteren' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '11-13': ['Bugs herstellen maakt de site betrouwbaarder.', 'Het verbetert gebruikerservaring en veiligheid.'] }
      },
      {
        id: 'q7',
        prompt: 'Zijn details belangrijk bij testen?',
        options: [
          { id: 'a', label: 'Nee, kleine details kunnen geen groot verschil maken' },
          { id: 'b', label: 'Ja, alleen voor design' },
          { id: 'c', label: 'Ja, kleine details kunnen een groot verschil maken' },
          { id: 'd', label: 'Ja, alleen voor testers' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '11-13': ['Kleine fouten kunnen grote gevolgen hebben.', 'Let op details tijdens testen.'] }
      },
      {
        id: 'q8',
        prompt: 'Wat doet een tester?',
        options: [
          { id: 'a', label: 'Controleren of alles goed werkt' },
          { id: 'b', label: 'Websites maken' },
          { id: 'c', label: 'Websites kapot maken' },
          { id: 'd', label: 'Bugs oplossen' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '11-13': ['Een tester controleert of functies werken.', 'Ze rapporteren en helpen problemen oplossen.'] }
      },
      {
        id: 'q9',
        prompt: 'Waarom testen we een website vóór ze online komt?',
        options: [
          { id: 'a', label: 'Om phishing te voorkomen' },
          { id: 'b', label: 'Om problemen te vermijden' },
          { id: 'c', label: 'Voor meer snelheid' },
          { id: 'd', label: 'Voor het design' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Testen helpt problemen te vinden voor gebruikers ze zien.', 'Het vermindert risico na lancering.'] }
      },
      {
        id: 'q10',
        prompt: "Je krijgt een vreemde mail van je 'bank' met de vraag je gegevens te bevestigen. Wat doe je?",
        options: [
          { id: 'a', label: 'Je vult je gegevens in, want de mail ziet er officieel uit' },
          { id: 'b', label: 'Je belt de bank via het nummer in de mail' },
          { id: 'c', label: 'Je stuurt de mail door naar vrienden om te vragen of zij hem ook kregen' },
          { id: 'd', label: 'Je verwijdert de mail en belt de bank via het officiële nummer op hun website' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '11-13': ['Gebruik officiële contactgegevens op de website, niet de link in de mail.', 'Bel de bank via het nummer op hun site.'] }
      },
      {
        id: 'q11',
        prompt: 'Wat kan een zwak wachtwoord veroorzaken?',
        options: [
          { id: 'a', label: 'Minder opslagruimte' },
          { id: 'b', label: 'Een tragere computer' },
          { id: 'c', label: 'Dat iemand je account hackt' },
          { id: 'd', label: 'Een tragere website' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '11-13': ['Een zwak wachtwoord maakt je account kwetsbaar.', 'Gebruik sterke, unieke wachtwoorden.'] }
      },
      {
        id: 'q12',
        prompt: 'Wat gebeurt er als een website crasht?',
        options: [
          { id: 'a', label: 'Ze werkt tijdelijk niet meer' },
          { id: 'b', label: 'Ze wordt sneller' },
          { id: 'c', label: 'Je account wordt verwijdert' },
          { id: 'd', label: 'Ze verwijdert zichzelf' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '11-13': ['Bij een crash werkt de site tijdelijk niet.', 'Soms is herstart of onderhoud nodig.'] }
      }
    ]
  }

  return [
    {
      id: 'q1',
      prompt: 'Welk wachtwoord lijkt sterk, maar is in werkelijkheid makkelijk te kraken door hackers?',
      options: [
        { id: 'a', label: '#Kabouter123' },
        { id: 'b', label: 'Brighte$t2024' },
        { id: 'c', label: 'vl@ggensch1p' },
        { id: 'd', label: 'P@ssword!' }
      ],
      correctOptionId: 'd',
      hintLinesByAge: { '14-16': ['Bekende woorden met kleine aanpassingen zijn vaak voorspelbaar.', 'Kies liever lange, unieke passphrases.'] }
    },
    {
      id: 'q2',
      prompt: 'Welk wachtwoord is het veiligst volgens best practices?',
      options: [
        { id: 'a', label: 'Welkom2024' },
        { id: 'b', label: 'Jan12345' },
        { id: 'c', label: 'IkHouVanPizza!2024' },
        { id: 'd', label: '12345678' }
      ],
      correctOptionId: 'c',
      hintLinesByAge: { '14-16': ['Lange, unieke zinnen met symbolen zijn sterk.', 'Passphrases zijn vaak makkelijker te onthouden en veiliger.'] }
    },
    {
      id: 'q3',
      prompt: 'Wat beschrijft phishing het best in een realistische situatie?',
      options: [
        { id: 'a', label: 'Een techniek waarbij aanvallers kwetsbaarheden in software misbruiken' },
        { id: 'b', label: 'Een aanval waarbij iemand zich voordoet als een betrouwbare bron om gegevens te ontfutselen' },
        { id: 'c', label: 'Een methode om versleutelde verbindingen te onderscheppen' },
        { id: 'd', label: 'Een geautomatiseerd script dat wachtwoorden raadt via brute force' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Phishing richt zich op misleiding en vertrouwen.', 'Controleer headers, afzender en links nauwkeurig.'] }
    },
    {
      id: 'q4',
      prompt: 'Waarom zijn phishing-aanvallen vaak succesvol, zelfs bij slimme gebruikers?',
      options: [
        { id: 'a', label: 'Ze gebruiken geavanceerde AI-hacks' },
        { id: 'b', label: 'Ze werken enkel via virussen' },
        { id: 'c', label: 'Ze zijn altijd technisch complex' },
        { id: 'd', label: 'Ze spelen in op vertrouwen, emotie en urgentie' }
      ],
      correctOptionId: 'd',
      hintLinesByAge: { '14-16': ['Psychologische triggers zoals urgentie werken goed op mensen.', 'Wees kritisch bij mails die haast suggereren.'] }
    },
    {
      id: 'q5',
      prompt: 'Welke van deze is een typisch voorbeeld van een phishing-techniek?',
      options: [
        { id: 'a', label: 'HTTPS loginpagina van je bank' },
        { id: 'b', label: 'Officiële systeemupdate' },
        { id: 'c', label: 'Mail die je onder druk vraagt om gegevens te bevestigen' },
        { id: 'd', label: 'Pushmelding van een app' }
      ],
      correctOptionId: 'c',
      hintLinesByAge: { '14-16': ['Phishing-mails vragen vaak om directe actie of inloggegevens.', 'Controleer URL en afzender voordat je iets invult.'] }
    },
    {
      id: 'q6',
      prompt: 'Wat is het belangrijkste doel van een load test in softwareontwikkeling?',
      options: [
        { id: 'a', label: 'Systeemgedrag meten onder realistische piekbelasting' },
        { id: 'b', label: 'UI verbeteren en design aanpassen' },
        { id: 'c', label: 'Code optimaliseren voor snelheid' },
        { id: 'd', label: 'Interfaces testen op gebruiksvriendelijkheid' }
      ],
      correctOptionId: 'a',
      hintLinesByAge: { '14-16': ['Load tests meten prestaties onder hoge belasting.', 'Ze helpen knelpunten en schaalbaarheidsproblemen vinden.'] }
    },
    {
      id: 'q7',
      prompt: 'Wat is het verschil tussen een load test en een stress test?',
      options: [
        { id: 'a', label: 'Load test is functioneel, stress test visueel' },
        { id: 'b', label: 'Load test simuleert normaal gebruik, stress test extreme belasting' },
        { id: 'c', label: 'Stress test is altijd geautomatiseerd' },
        { id: 'd', label: 'Er is geen technisch verschil' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Load test = normale piek; stress test = voorbij normale limieten.', 'Stress tests laten zien wanneer systemen falen.'] }
    },
    {
      id: 'q8',
      prompt: 'Wat bedoelen we met schaalbaarheid van een systeem?',
      options: [
        { id: 'a', label: 'Hoe snel het opstart na reboot' },
        { id: 'b', label: 'Hoeveel fouten het systeem heeft' },
        { id: 'c', label: 'Hoe mooi de interface schaalt op schermen' },
        { id: 'd', label: 'Hoe goed het systeem extra belasting aankan bij groei' }
      ],
      correctOptionId: 'd',
      hintLinesByAge: { '14-16': ['Schaalbaarheid betekent: groei verzorgen zonder performanceverlies.', 'Architectuur en resources bepalen schaalbaarheid.'] }
    },
    {
      id: 'q9',
      prompt: 'Wat is het meest waarschijnlijke gevolg van een softwareproject zonder testing?',
      options: [
        { id: 'a', label: 'Onvoorspelbare bugs in productie' },
        { id: 'b', label: 'Lagere kosten en stabieler product' },
        { id: 'c', label: 'Snellere release zonder problemen' },
        { id: 'd', label: 'Betere UX door minder restricties' }
      ],
      correctOptionId: 'a',
      hintLinesByAge: { '14-16': ['Zonder testing komen bugs onvoorspelbaar in productie.', 'Dit kan leiden tot downtime en gebruikersproblemen.'] }
    },
    {
      id: 'q10',
      prompt: 'Wat is de beste definitie van een “bug” in software?',
      options: [
        { id: 'a', label: 'Onvoltooide feature in development' },
        { id: 'b', label: 'Visuele afwijking in UI design' },
        { id: 'c', label: 'Onbedoeld gedrag door fout in code of logica' },
        { id: 'd', label: 'Geplande systeemwijziging' }
      ],
      correctOptionId: 'c',
      hintLinesByAge: { '14-16': ['Een bug is onbedoeld gedrag door code of logica.', 'Bugs kunnen functioneel of security-gerelateerd zijn.'] }
    },
    {
      id: 'q11',
      prompt: 'Waarom zijn details cruciaal in kwaliteitscontrole (QA)?',
      options: [
        { id: 'a', label: 'Omdat ze enkel esthetisch belangrijk zijn' },
        { id: 'b', label: 'Omdat kleine afwijkingen grote systeemimpact kunnen hebben' },
        { id: 'c', label: 'Omdat testers alleen op details letten' },
        { id: 'd', label: 'Omdat details tijd besparen' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Kleine afwijkingen kunnen cascade-fouten veroorzaken.', 'QA zoekt deze subtiele issues vroeg in het proces.'] }
    },
    {
      id: 'q12',
      prompt: 'Wat kan de impact zijn van een kleine fout in een systeem?',
      options: [
        { id: 'a', label: 'Geen effect in de praktijk' },
        { id: 'b', label: 'Alleen cosmetische issues' },
        { id: 'c', label: 'Enkel lichte vertraging' },
        { id: 'd', label: 'Kritische fouten in functionaliteit of security' }
      ],
      correctOptionId: 'd',
      hintLinesByAge: { '14-16': ['Een klein foutje kan grote gevolgen hebben in productie.', 'Denk aan security en business impact.'] }
    },
    {
      id: 'q13',
      prompt: 'Waarom is observatie een belangrijke skill voor testers?',
      options: [
        { id: 'a', label: 'Omdat subtiele afwijkingen anders gemist worden' },
        { id: 'b', label: 'Omdat testers vooral code schrijven' },
        { id: 'c', label: 'Omdat testen automatisch gebeurt' },
        { id: 'd', label: 'Omdat bugs vanzelf zichtbaar zijn' }
      ],
      correctOptionId: 'a',
      hintLinesByAge: { '14-16': ['Observation helpt om subtiele regressies te vinden.', 'Let op edge cases en rare combinaties.'] }
    },
    {
      id: 'q14',
      prompt: 'Wat is de belangrijkste rol van QA (Quality Assurance) binnen een team?',
      options: [
        { id: 'a', label: 'Nieuwe features bouwen' },
        { id: 'b', label: 'Code review uitvoeren als developers' },
        { id: 'c', label: 'Kwaliteit bewaken en risico\'s vroeg detecteren' },
        { id: 'd', label: 'Marketing verbeteren' }
      ],
      correctOptionId: 'c',
      hintLinesByAge: { '14-16': ['QA bewaakt kwaliteit en vindt risico\'s vroeg.', 'Ze helpen besluiten te nemen over release readiness.'] }
    },
    {
      id: 'q15',
      prompt: 'Waarom is duidelijke communicatie belangrijk bij softwareontwikkeling en testing?',
      options: [
        { id: 'a', label: 'Omdat development dan trager gaat' },
        { id: 'b', label: 'Omdat het misverstanden en fouten voorkomt in het proces' },
        { id: 'c', label: 'Omdat het alleen nuttig is voor managers' },
        { id: 'd', label: 'Omdat het design strakker maakt' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Duidelijke communicatie voorkomt misverstanden en regressies.', 'Het helpt teams sneller en correcter leveren.'] }
    }
  ]
}

export default function FightTheBug({ ageGroup, onEnd }: Props) {
  const effectiveAge: AgeGroup = useMemo(() => {
    if (ageGroup) return ageGroup
    try {
      const qsAge = new URLSearchParams(window.location.search || '').get('age')
      if (qsAge) return inferAgeGroup(qsAge)
    } catch { /* ignore */ }
    try {
      const ss = sessionStorage.getItem('playerCategory') || sessionStorage.getItem('ageGroup') || sessionStorage.getItem('age') || ''
      if (ss) return inferAgeGroup(ss)
    } catch { /* ignore */ }
    return '11-13'
  }, [ageGroup])

  const pool = useMemo(() => buildQuestionPool(effectiveAge), [effectiveAge])
  const isTestEnv = typeof process !== 'undefined' && (process as unknown as { env?: Record<string, string> }).env?.NODE_ENV === 'test'

  const [showIntro, setShowIntro] = useState(true)
  const [showPracticeStart, setShowPracticeStart] = useState(false)
  const [showPracticeEnd, setShowPracticeEnd] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
  const [practiceCorrect, setPracticeCorrect] = useState(0)

  const [showHelp, setShowHelp] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [paused, setPaused] = useState(false)
  const [running, setRunning] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)

  const [playerEnergy, setPlayerEnergy] = useState(100)
  const [bugEnergy, setBugEnergy] = useState(100)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  const [question, setQuestion] = useState<Question>(() => pickNext(pool))
  const lastQuestionIdRef = useRef<string | undefined>(undefined)
  const usedQuestionIdsRef = useRef<Set<string>>(new Set())
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [floatingDelta, setFloatingDelta] = useState<{ target: 'player' | 'bug'; value: number } | null>(null)
  // ensure linter sees the variable as 'used' in environments where JSX usage
  // might not be detected by the ESLint rule; this is a harmless no-op read
  // that avoids the TS6133 / no-unused-vars warning.
  void floatingDelta

  const checkingRef = useRef(false)
  const hintAutoShownRef = useRef(false)
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // Fireworks audio element (base) and active cloned nodes for overlapping playback
  const fireworksRef = useRef<HTMLAudioElement | null>(null)
  const activeFireworksRef = useRef<HTMLAudioElement[]>([])
  // Background & one-shot sound refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const correctSoundRef = useRef<HTMLAudioElement | null>(null)
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null)
  const [bugSprite, setBugSprite] = useState<string>(DefaultBugImg)
  const damageTimerRef = useRef<number | null>(null)

  const percent = useMemo(() => computePercent(totalCorrect, totalWrong), [totalCorrect, totalWrong])
  // If the end screen is visible, use the player's final energy as the
  // displayed percentage and star calculation. This ensures that when the
  // player stops the game (which sets playerEnergy to 0) the stars and score
  // circle reflect that final score instead of an earlier percent based on
  // correct/wrong answers.
  const starCount = useMemo(() => {
    const pctForStars = showEnd ? Math.max(0, Math.min(100, Math.round(playerEnergy))) : percent
    return computeStars(pctForStars)
  }, [percent, showEnd, playerEnergy])

  const circleStyle = useMemo(() => {
    const pctForCircle = showEnd ? Math.max(0, Math.min(100, Math.round(playerEnergy))) : percent
    return ({ ['--pz-score-pct' as unknown as string]: `${pctForCircle}%` } as unknown as React.CSSProperties)
  }, [percent, showEnd, playerEnergy])

  const localHighKey = useMemo(() => `pz-highscore_fightthebug_${effectiveAge}`, [effectiveAge])
  const [highScore, setHighScore] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(localHighKey)
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  })
  // isNewHigh removed: highscore banner was deleted from end screen

  const hintLines = useMemo(() => {
    const custom = question.hintLinesByAge?.[effectiveAge]
    if (custom && custom.length) return custom
    if (effectiveAge === '8-10') return ['Kies het antwoord met letters + cijfers + tekens.', 'Neem je tijd en lees goed.']
    if (effectiveAge === '11-13') return ['Kies het antwoord dat het meest veilig is.', 'Denk aan: mix, lengte, 2FA, updates.']
    return ['Kies het antwoord dat risico vermindert (unique, 2FA, verifiëren).', 'Denk aan: phishing, brute force, leaks.']
  }, [effectiveAge, question])

  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [effectiveAge])

  useEffect(() => {
    setMounted(true)
    // try to flush any pending highscores that were queued earlier
    try { void retryPendingHighscores() } catch { /* ignore */ }
    return () => { setMounted(false) }
  }, [])

  // Helper behavior inlined where used to avoid linter unused-var warnings.

  // Control background music playback based on game UI state
  useEffect(() => {
    const shouldPlay = running && !paused && !showIntro && !showPracticeStart && !showPracticeEnd && !showHelp && !showHint && !showEnd
    const bg = bgMusicRef.current
    if (!bg) return
    try {
      if (shouldPlay) {
        // start (or resume) background music
        const p = bg.play()
        if (p && typeof p.then === 'function') p.catch(() => { /* ignore autoplay rejection */ })
      } else {
        try { bg.pause() } catch { /* ignore */ }
        try { bg.currentTime = 0 } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [running, paused, showIntro, showPracticeStart, showPracticeEnd, showHelp, showHint, showEnd])

  // Fireworks canvas: initialize when end screen is shown (reuse shared fireworks)
  React.useEffect(() => {
    if (!showEnd) return
    let cleanup: (() => void) | null = null
    ;(async () => {
      try {
        console.debug('[FightTheBug] initializing fireworks (showEnd=true)')
        const canvasEl = fwCanvasRef.current
        if (!canvasEl) { console.debug('[FightTheBug] fireworks canvas ref missing'); return }

        // Wait until the canvas has a non-zero layout size (it may be hidden or not laid out yet).
        let rect = canvasEl.getBoundingClientRect()
        let tries = 0
        while ((rect.width === 0 || rect.height === 0) && tries < 8) {
          await new Promise((r) => setTimeout(r, 50))
          rect = canvasEl.getBoundingClientRect()
          tries += 1
        }
        console.debug('[FightTheBug] canvas rect after wait', rect, 'dpr=', window.devicePixelRatio)
        if (rect.width === 0 || rect.height === 0) {
          console.debug('[FightTheBug] canvas has zero size, aborting fireworks init')
          return
        }

        // Use explicit import calls instead of importing from a variable so Vite
        // can analyze the import paths. Try the primary module first and fall
        // back to the .ts variant if the first import fails.
        let mod: unknown = null
        try {
          mod = await import('../PasswordZapper/passwordZapperFireworks')
          if (mod) console.debug('[FightTheBug] imported fireworks module via ../PasswordZapper/passwordZapperFireworks')
        } catch (e1) {
          console.debug('[FightTheBug] import failed for ../PasswordZapper/passwordZapperFireworks', e1)
          try {
            mod = await import('../PasswordZapper/passwordZapperFireworks.ts')
            if (mod) console.debug('[FightTheBug] imported fireworks module via ../PasswordZapper/passwordZapperFireworks.ts')
          } catch (e2) {
            console.debug('[FightTheBug] import failed for ../PasswordZapper/passwordZapperFireworks.ts', e2)
          }
        }

        if (!mod) {
          console.debug('[FightTheBug] could not import any fireworks module')
          return
        }

        const maybeInit = (mod as { default?: unknown })
        if (typeof maybeInit.default === 'function') {
          console.debug('[FightTheBug] running fireworks initializer')
          cleanup = (maybeInit.default as (c: HTMLCanvasElement) => (() => void))(canvasEl)
        } else {
          console.debug('[FightTheBug] fireworks module did not export a default init function', maybeInit)
        }
      } catch (err) {
        console.debug('[FightTheBug] fireworks import/init failed', err)
      }
    })()
    return () => { try { if (cleanup) cleanup() } catch { /* ignore */ } }
  }, [showEnd])

  useEffect(() => {
    const clsModal = 'pz-modal-open'
    const clsEnd = 'pz-end-open'
    try {
      const modalOpen = showIntro || showPracticeStart || showPracticeEnd || showHelp || showHint || paused
      if (modalOpen) document.body.classList.add(clsModal)
      else document.body.classList.remove(clsModal)
      if (showEnd) document.body.classList.add(clsEnd)
      else document.body.classList.remove(clsEnd)
    } catch { /* ignore */ }
    return () => {
      try { document.body.classList.remove(clsModal) } catch { /* ignore */ }
      try { document.body.classList.remove(clsEnd) } catch { /* ignore */ }
    }
  }, [paused, showEnd, showHelp, showHint, showIntro, showPracticeStart, showPracticeEnd])

  const onPauseEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart])

  const onHelpEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setShowHelp(true)
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart])

  const onHintEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked'] && !isTestEnv) return
    } catch { /* ignore */ }
    setShowHint(true)
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart, isTestEnv])

  useEffect(() => {
    window.addEventListener('minigame:pause', onPauseEvt as EventListener)
    window.addEventListener('minigame:question', onHelpEvt as EventListener)
    window.addEventListener('minigame:hint', onHintEvt as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPauseEvt as EventListener)
      window.removeEventListener('minigame:question', onHelpEvt as EventListener)
      window.removeEventListener('minigame:hint', onHintEvt as EventListener)
    }
  }, [onHelpEvt, onHintEvt, onPauseEvt])

  useEffect(() => {
    // Avoid calling setState synchronously inside the effect to prevent
    // cascading renders (react-hooks/set-state-in-effect). Defer updates.
    const timer = window.setTimeout(() => {
      if (paused) setRunning(false)
      else {
        if (!showEnd && !showIntro && !showPracticeStart && !showPracticeEnd) setRunning(true)
      }
    }, 0)
    return () => { clearTimeout(timer) }
  }, [paused, showEnd, showIntro, showPracticeStart, showPracticeEnd])

  useEffect(() => {
    // Defer test env state changes to avoid synchronous state updates in effect
    if (isTestEnv) {
      const t = window.setTimeout(() => {
        setShowIntro(false)
        setShowPracticeStart(false)
        setIsPractice(false)
        setRunning(true)
      }, 0)
      return () => { clearTimeout(t) }
    }
  }, [isTestEnv])

  useEffect(() => {
    // Defer initial question setup to avoid synchronous setState calls
    const q = pickUnusedQuestion(pool, usedQuestionIdsRef.current, lastQuestionIdRef.current)
    const t = window.setTimeout(() => {
      setQuestion(q)
      lastQuestionIdRef.current = q?.id
      setSelectedOptionId(null)
      setAnswerState('idle')
      setFeedback(null)
      setFeedbackType(null)
    }, 0)
    return () => { clearTimeout(t) }
  }, [pool])

  const resetRun = useCallback((opts?: { practice?: boolean }) => {
    const practice = !!opts?.practice
    setStoppedByUser(false)
    setShowEnd(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    hintAutoShownRef.current = false
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }

    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false

    // reset bug sprite and clear any damage timers
    try { setBugSprite(DefaultBugImg) } catch { /* ignore */ }
    try { if (damageTimerRef.current) { window.clearTimeout(damageTimerRef.current); damageTimerRef.current = null } } catch { /* ignore */ }

    setIsPractice(practice)
    setPracticeCorrect(0)

    // reset the used question ids for the new run
    try { usedQuestionIdsRef.current.clear() } catch { /* ignore */ }
    const q = pickUnusedQuestion(pool, usedQuestionIdsRef.current)
    setQuestion(q)
    lastQuestionIdRef.current = q?.id
    setRunning(!practice)
  }, [pool])

  const restartGame = useCallback(() => {
    // Perform a full page reload so the player truly restarts from the very
    // beginning (clears transient in-memory state). This ensures behaviour
    // matches the user's expectation: a fresh start like a new load.
    try {
      // stop any fireworks audio that might still be playing from the end screen
      try {
        for (const a of activeFireworksRef.current.slice()) {
          try { a.pause() } catch { /* ignore */ }
          try { a.currentTime = 0 } catch { /* ignore */ }
        }
        activeFireworksRef.current.length = 0
        if (fireworksRef.current) {
          try { fireworksRef.current.pause() } catch { /* ignore */ }
          try { fireworksRef.current.currentTime = 0 } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      
      // Use location.reload() to reload current page. Wrap in try/catch to be safe in tests.
      window.location.reload()
    } catch {
      // Fallback: try assign href to force reload
      try { window.location.assign(window.location.href) } catch { /* ignore */ }
    }
  }, [])

  // Initialize fireworks audio on mount and cleanup on unmount
  useEffect(() => {
    try {
      const a = new Audio(fireworksSound)
      a.preload = 'auto'
      a.volume = 0.85
      fireworksRef.current = a
    } catch { fireworksRef.current = null }
    // Initialize background music and short answer sounds
    try {
      const bg = new Audio(fightTheBugMusic)
      bg.preload = 'auto'
      bg.loop = true
      bg.volume = 0.35
      bgMusicRef.current = bg
    } catch { bgMusicRef.current = null }
    try {
      const c = new Audio(correctFightTheBug)
      c.preload = 'auto'
      c.volume = 0.9
      correctSoundRef.current = c
    } catch { correctSoundRef.current = null }
    try {
      const w = new Audio(wrongFightTheBug)
      w.preload = 'auto'
      w.volume = 0.9
      wrongSoundRef.current = w
    } catch { wrongSoundRef.current = null }
    
    return () => {
      try {
        if (fireworksRef.current) {
          fireworksRef.current.pause()
          try { fireworksRef.current.currentTime = 0 } catch { /* ignore */ }
        }
        for (const a of activeFireworksRef.current.slice()) {
          try { a.pause() } catch { /* ignore */ }
          try { a.currentTime = 0 } catch { /* ignore */ }
        }
        activeFireworksRef.current.length = 0
        // cleanup bg & one-shot base audio
        try { if (bgMusicRef.current) { bgMusicRef.current.pause(); try { bgMusicRef.current.currentTime = 0 } catch { /* ignore */ } } } catch { /* ignore */ }
        try { if (correctSoundRef.current) { correctSoundRef.current.pause(); try { correctSoundRef.current.currentTime = 0 } catch { /* ignore */ } } } catch { /* ignore */ }
        try { if (wrongSoundRef.current) { wrongSoundRef.current.pause(); try { wrongSoundRef.current.currentTime = 0 } catch { /* ignore */ } } } catch { /* ignore */ }
      } catch { /* ignore */ }
      fireworksRef.current = null
      bgMusicRef.current = null
      correctSoundRef.current = null
      wrongSoundRef.current = null
      
    }
  }, [])

  // Play fireworks sound when end screen appears (match other games)
  useEffect(() => {
    if (!showEnd) return
    const base = fireworksRef.current
    if (!base) return
    try {
      const f = (base.cloneNode(true) as HTMLAudioElement)
      activeFireworksRef.current.push(f)
      const remove = () => {
        try {
          const idx = activeFireworksRef.current.indexOf(f)
          if (idx >= 0) activeFireworksRef.current.splice(idx, 1)
        } catch { /* ignore */ }
      }
      f.addEventListener('ended', remove)
      f.addEventListener('pause', remove)
      const p = f.play()
      if (p && typeof p.then === 'function') p.catch(() => { /* ignore play rejection */ })
    } catch {
      try { base.currentTime = 0; void base.play() } catch { /* ignore */ }
    }
  }, [showEnd])

  const startPractice = useCallback(() => {
    setShowIntro(false)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(true)
    setPracticeCorrect(0)
    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setPaused(false)
    setRunning(true)
    setStoppedByUser(false)
    setShowEnd(false)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
  }, [])

  const startRealGame = useCallback(() => {
    setShowPracticeEnd(false)
    setShowPracticeStart(false)
    setShowIntro(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setPaused(false)
    setRunning(true)
    setStoppedByUser(false)
    setShowEnd(false)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
    hintAutoShownRef.current = false
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [])

  const endGame = useCallback((reason: 'win' | 'lose' | 'stop') => {
    setRunning(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setShowIntro(false)
    if (reason === 'stop') {
      // Mark as stopped by user and ensure player energy is shown as 0
      setStoppedByUser(true)
      try { setPlayerEnergy(0) } catch { /* ignore */ }
    }

    // Use the player's remaining energy (0-100) as the final score/percentage,
    // except when the user stopped the game: then finalScore is explicitly 0.
    const finalScore = reason === 'stop' ? 0 : Math.max(0, Math.min(100, Math.round(playerEnergy)))
    try {
      const prev = highScore ?? 0
      const next = Math.max(prev, finalScore)
      localStorage.setItem(localHighKey, String(next))
      setHighScore(next)
    } catch { /* ignore */ }

    setShowEnd(true)
    // clear any pending damage timers and ensure sprite is default
    try { if (damageTimerRef.current) { window.clearTimeout(damageTimerRef.current); damageTimerRef.current = null } } catch { /* ignore */ }
    try { setBugSprite(DefaultBugImg) } catch { /* ignore */ }
    try { if (onEnd) onEnd({ score: finalScore, timeMs: 0, mistakes: totalWrong }) } catch { /* ignore */ }

    // best-effort send highscore (non-blocking). If network fails it's queued.
    try {
      const player = (sessionStorage.getItem('playerName') || sessionStorage.getItem('player') || 'Anon') as string
      void sendHighscore('fight-the-bug', player, finalScore, { ageGroup: effectiveAge, mistakes: totalWrong }).catch(() => { /* queued */ })
    } catch { /* ignore */ }
  }, [highScore, localHighKey, onEnd, totalWrong, playerEnergy])

  useEffect(() => {
    if (showEnd) return
    if (isPractice) return
    // Call endGame asynchronously to avoid setState-in-effect lint errors
    if (bugEnergy <= 0 || totalCorrect >= 10) {
      const t = window.setTimeout(() => endGame('win'), 0)
      return () => { clearTimeout(t) }
    }
    if (playerEnergy <= 0) {
      const t = window.setTimeout(() => endGame('lose'), 0)
      return () => { clearTimeout(t) }
    }
  }, [bugEnergy, endGame, isPractice, playerEnergy, showEnd, totalCorrect])

  const unlockHintIfNeeded = useCallback((nextWrongTotal: number) => {
    const threshold = MISTAKES_HINT_THRESHOLD[effectiveAge]
    if (nextWrongTotal < threshold) return
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked']) {
        w['__pz_hint_unlocked'] = true
        window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
      }
    } catch { /* ignore */ }
    // Do NOT automatically open the hint popup. We only unlock the hint button
    // so the top-level hint control can open it when the player requests it.
    // This matches the behavior in NietZoSlimmeThermostaat.
    hintAutoShownRef.current = false
  }, [effectiveAge])

  const nextQuestion = useCallback(() => {
    const next = pickUnusedQuestion(pool, usedQuestionIdsRef.current, lastQuestionIdRef.current)
    setQuestion(next)
    lastQuestionIdRef.current = next?.id
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
    // After moving to the next question, lock the hint button again so the
    // player must earn the hint for the new round. Also reset the auto-show flag.
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    hintAutoShownRef.current = false
  }, [pool])

  const checkAnswer = useCallback((optionIdParam?: string) => {
    if (!running || paused || showIntro || showPracticeStart || showPracticeEnd || showHelp || showHint || showEnd) return
    const sel = optionIdParam ?? selectedOptionId
    if (!sel) return
    if (checkingRef.current) return
    checkingRef.current = true

    const isCorrect = sel === question.correctOptionId
    if (isTestEnv) {
      try {
        // Debug log to diagnose why tests sometimes take the wrong branch
        // eslint-disable-next-line no-console
        console.debug('[FTB][checkAnswer] sel=', sel, 'correct=', question.correctOptionId, 'running=', running, 'paused=', paused, 'answerState=', answerState, 'selectedOptionId=', selectedOptionId, 'checkingRef=', checkingRef.current)
      } catch { /* ignore */ }
    }
    if (isCorrect) {
      if (isTestEnv) {
        try { /* eslint-disable-next-line no-console */ console.debug('[FTB][checkAnswer] taking correct branch') } catch { /* ignore */ }
      }
      setAnswerState('correct')
      setFeedback(randFrom(POSITIVE_FEEDBACK))
      setFeedbackType('good')
      // play correct answer sound (clone to allow overlapping playback)
      try {
        const base = correctSoundRef.current
        if (base) {
          const clone = (base.cloneNode(true) as HTMLAudioElement)
          clone.preload = 'auto'
          const remove = () => {
            try { clone.removeEventListener('ended', remove) } catch { /* ignore */ }
            try { clone.removeEventListener('pause', remove) } catch { /* ignore */ }
          }
          clone.addEventListener('ended', remove)
          clone.addEventListener('pause', remove)
          const p = clone.play()
          if (p && typeof p.then === 'function') p.catch(() => { /* ignore */ })
        }
      } catch { /* ignore */ }
      // show the delta as a positive number ("10 energie") — the color/context
      // already indicates this is a loss for the bug. Keep the subtraction logic
      // unchanged so energy is still decreased by 10.
      setFloatingDelta({ target: 'bug', value: 10 })

      setBugEnergy((prev) => {
        const newEnergy = Math.max(0, prev - 10)
        // Force synchronous DOM update in test environment to avoid timing issues
        // (feedback banner / floating delta) before the next question resets
        // those values. Use a small timeout in test env instead of 0ms.
        if (isTestEnv && typeof window !== 'undefined') {
          try {
            const bugEnergyEl = document.getElementById('ftb-energy-bug-value')
            if (bugEnergyEl) bugEnergyEl.textContent = String(newEnergy)
            const bugEnergyFillEl = document.getElementById('ftb-energy-bug-fill')
            if (bugEnergyFillEl) bugEnergyFillEl.style.width = `${newEnergy}%`
          } catch { /* ignore */ }
        }
        return newEnergy
      })
      setTotalCorrect((prev) => prev + 1)

      // show the damage sprite for 1.5 seconds
      try {
        if (damageTimerRef.current) { window.clearTimeout(damageTimerRef.current); damageTimerRef.current = null }
      } catch { /* ignore */ }
      try {
        setBugSprite(TakingDamageBugImg)
        damageTimerRef.current = window.setTimeout(() => {
          try { setBugSprite(DefaultBugImg) } catch { /* ignore */ }
          try { damageTimerRef.current = null } catch { /* ignore */ }
        }, 500) as unknown as number
      } catch { /* ignore */ }

      if (isPractice) {
        setPracticeCorrect((prev) => {
          const next = prev + 1
          if (next >= 3) {
            setRunning(false)
            setShowPracticeEnd(true)
          }
          return next
        })
      }

      // In tests we still need a short delay so React can flush state updates
      // (feedback banner / floating delta) before the next question resets
      // those values. Use a small timeout in test env instead of 0ms.
      window.setTimeout(() => nextQuestion(), isTestEnv ? 120 : 650)
      return
    }

    if (isTestEnv) {
      try { /* eslint-disable-next-line no-console */ console.debug('[FTB][checkAnswer] taking wrong branch') } catch { /* ignore */ }
    }
    setAnswerState('wrong')
    setFeedback(randFrom(NEGATIVE_FEEDBACK))
    setFeedbackType('bad')
    // play wrong answer sound (clone to allow overlapping playback)
    try {
      const baseW = wrongSoundRef.current
      if (baseW) {
        const cloneW = (baseW.cloneNode(true) as HTMLAudioElement)
        cloneW.preload = 'auto'
        const removeW = () => {
          try { cloneW.removeEventListener('ended', removeW) } catch { /* ignore */ }
          try { cloneW.removeEventListener('pause', removeW) } catch { /* ignore */ }
        }
        cloneW.addEventListener('ended', removeW)
        cloneW.addEventListener('pause', removeW)
        const pW = cloneW.play()
        if (pW && typeof pW.then === 'function') pW.catch(() => { /* ignore */ })
      }
    } catch { /* ignore */ }
    // show the delta as a positive number ("10 energie") for consistency
    // and remove the negative sign from the badge. Energy is still reduced.
    setFloatingDelta({ target: 'player', value: 10 })
    setPlayerEnergy((prev) => Math.max(0, prev - 10))
    setTotalWrong((prev) => {
      const next = prev + 1
      if (!isPractice) unlockHintIfNeeded(next)
      return next
    })

    // show the "wrong answer" sprite briefly, then revert to default
    try {
      if (damageTimerRef.current) { window.clearTimeout(damageTimerRef.current); damageTimerRef.current = null }
    } catch { /* ignore */ }
    try {
      setBugSprite(WrongAnswerBugImg)
      damageTimerRef.current = window.setTimeout(() => {
        try { setBugSprite(DefaultBugImg) } catch { /* ignore */ }
        try { damageTimerRef.current = null } catch { /* ignore */ }
      }, 500) as unknown as number
    } catch { /* ignore */ }

    window.setTimeout(() => {
      setAnswerState('idle')
      setSelectedOptionId(null) // clear selection so effect won't re-run checkAnswer
      setFeedback(null)
      setFeedbackType(null)
      setFloatingDelta(null)
      checkingRef.current = false
    }, isTestEnv ? 120 : 650)
  }, [isPractice, nextQuestion, paused, question.correctOptionId, running, selectedOptionId, showEnd, showHelp, showHint, showIntro, showPracticeEnd, showPracticeStart, unlockHintIfNeeded, isTestEnv])

  useEffect(() => {
    if (!selectedOptionId) return
    if (answerState !== 'idle') return
    // Defer checkAnswer to avoid synchronous state updates inside effect
    const t = window.setTimeout(() => checkAnswer(), 0)
    return () => { clearTimeout(t) }
  }, [answerState, checkAnswer, selectedOptionId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      if (!selectedOptionId) return
      checkAnswer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [checkAnswer, selectedOptionId])

  // Handler for when an option button is clicked. Tests and the UI call
  // this as `handleSelect(...)`. Selecting an option simply updates the
  // `selectedOptionId` (the effect above will defer and call `checkAnswer`).
  // Guard selection with the same disabled conditions used on the button
  // elements.
  const handleSelect = useCallback((id: string, btnId?: string) => {
    if (!running || paused || showHelp || showHint || showPracticeStart || showPracticeEnd || showIntro) return
    // If the clicked button belongs to a different question (race), ignore it.
    try {
      if (btnId && !btnId.includes(question.id)) return
    } catch { /* ignore */ }
    setSelectedOptionId(id)
  }, [running, paused, showHelp, showHint, showPracticeStart, showPracticeEnd, showIntro, question.id])

  useEffect(() => {
    const cls = 'pz-practice-open'
    try {
      const open = showPracticeStart || showPracticeEnd
      if (open) document.body.classList.add(cls)
      else document.body.classList.remove(cls)
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove(cls) } catch { /* ignore */ } }
  }, [showPracticeEnd, showPracticeStart])

  const progressTotal = isPractice ? 3 : 10
  const progressValue = isPractice ? practiceCorrect : Math.min(10, totalCorrect)
  const progressPercent = useMemo(() => {
    const total = progressTotal
    if (!total) return 0
    return Math.max(0, Math.min(100, Math.round((progressValue / total) * 100)))
  }, [progressTotal, progressValue])

  return (
    <div id="ftb-root" className="ftb-root">
                    <div id="ftb-game-area" className="ftb-game-area">
          {!showEnd && (
        <div id="ftb-main">
            {/* feedback banner is rendered via a portal to document.body (see bottom of this component) */}
          {isPractice && (
            // Use the shared .pz-score markup so the practice pill/timer matches other games
            <div className="pz-score-stack" aria-hidden>
              <div className="pz-score">Oefenronde</div>
            </div>
          )}

          {/* HUD: only show the Bug energy in the top-left HUD when NOT in practice */}
          {!isPractice && (
              <div id="ftb-hud" className="ftb-hud">
                <div className="ftb-energy-bug-wrapper">
                  <div id="ftb-energy-bug" className="ftb-energy ftb-energy--bug" aria-label="Energie Bug">
                    <div id="ftb-energy-bug-title" className="ftb-energy__title">Energie Bug</div>
                    <div id="ftb-energy-bug-bar" className="ftb-energy__bar">
                      <div id="ftb-energy-bug-fill" className="ftb-energy__fill ftb-energy__fill--bug" style={{ width: `${Math.max(0, Math.min(100, bugEnergy))}%` }} />
                      <div id="ftb-energy-bug-value" className="ftb-energy__value">{bugEnergy}</div>
                      {/* Floating delta for bug shown under the energy bar (e.g. "-10 energie").
                          By placing it inside the bar, absolute positioning centers relative
                          to the visible progress track width. */}
                      {floatingDelta && floatingDelta.target === 'bug' && (
                        <div
                          id="ftb-delta-bug"
                          className={`ftb-delta ${feedbackType === 'good' ? 'ftb-delta--good' : 'ftb-delta--bad'}`}
                          aria-hidden
                          style={{ left: `${Math.max(0, Math.min(100, bugEnergy))}%` }}
                        >
                          {`-${floatingDelta.value} energie`}
                        </div>
                      )}
                    </div>
                    {/* Floating delta for bug shown under the energy bar (e.g. "-10 energie").
                        Place as a direct child of #ftb-energy-bug so centering is relative
                        to the full widget rather than the inner bar. */}
                    {floatingDelta && floatingDelta.target === 'bug' && (
                      <div id="ftb-delta-bug" className={`ftb-delta ${feedbackType === 'good' ? 'ftb-delta--good' : 'ftb-delta--bad'}`} aria-hidden>
                        {`-${floatingDelta.value} energie`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          )}

          <div id="ftb-bug" className={`ftb-bug ${feedbackType ? (feedbackType === 'good' ? 'ftb-bug--good' : 'ftb-bug--bad') : ''}`} aria-hidden>
            {/* Replace CSS-drawn bug with an image asset (defaultBug.png). Bug banner moved out
                of the bug element to avoid clipping by parent overflow and stacking context
                issues. The shared .pz-feedback class is used so visuals match other games. */}
            <img id="ftb-bug-image" className="ftb-bug__img" src={bugSprite} alt="Bug" />
            {/* bug floating delta is rendered in the HUD area so it appears under de Energie Bug bar */}
          </div>

          <div id="ftb-question" className="ftb-question">
            <div id="ftb-question-box" className="ftb-question__box">
              <div id="ftb-question-title" className="ftb-question__title">{question.prompt}</div>
              <div id="ftb-options-list" className="ftb-options" role="list">
                {question.options.slice(0, 4).map((opt) => {
                  const isSelected = selectedOptionId === opt.id
                  const isCorrect = answerState === 'correct' && isSelected
                  const isWrong = answerState === 'wrong' && isSelected
                  const isOptionCorrect = opt.id === question.correctOptionId
                  return (
                    <button
                      key={opt.id}
                      id={isOptionCorrect ? `ftb-option-${question.id}-${opt.id}-correct` : `ftb-option-${question.id}-${opt.id}-wrong`}
                      className={[
                        'ftb-option',
                        isSelected ? 'ftb-option--selected' : '',
                        isCorrect ? 'ftb-option--correct' : '',
                        isWrong ? 'ftb-option--wrong' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={(e) => handleSelect(opt.id, (e.currentTarget && (e.currentTarget as HTMLButtonElement).id) || undefined)}
                      disabled={!running || paused || showHelp || showHint || showPracticeStart || showPracticeEnd || showIntro}
                      aria-label={opt.label}
                      type="button"
                    >
                      {opt.icon && <span id={isOptionCorrect ? `ftb-option-icon-${question.id}-${opt.id}-correct` : `ftb-option-icon-${question.id}-${opt.id}-wrong`} className="ftb-option__icon" aria-hidden>{opt.icon}</span>}
                      <span id={isOptionCorrect ? `ftb-option-label-${question.id}-${opt.id}-correct` : `ftb-option-label-${question.id}-${opt.id}-wrong`} className="ftb-option__label">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {isPractice ? (
            <div id="ftb-progress" className="ftb-progress" aria-label="Progress">
            <div id="ftb-progress-label" className="ftb-progress__label">Juiste antwoorden</div>
            <div id="ftb-progress-track" className="ftb-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={progressTotal} aria-valuenow={progressValue}>
              <div id="ftb-progress-fill" className="ftb-progress__fill" style={{ width: `${progressPercent}%` }} />
              <div id="ftb-progress-text" className="ftb-progress__text">{progressValue}/{progressTotal}</div>
            </div>
            </div>
          ) : (
            /* During the real game show the player energy in the bottom-left progress area */
            <div id="ftb-progress" className="ftb-progress" aria-label="Energie Speler">
                <div id="ftb-energy-player" className="ftb-energy ftb-energy--player">
                <div id="ftb-energy-player-title" className="ftb-energy__title">Energie Speler</div>
                <div id="ftb-energy-player-bar" className="ftb-energy__bar">
                  <div id="ftb-energy-player-fill" className="ftb-energy__fill ftb-energy__fill--player" style={{ width: `${Math.max(0, Math.min(100, playerEnergy))}%` }} />
                  <div id="ftb-energy-player-value" className="ftb-energy__value">{playerEnergy}</div>
                </div>
                {/* player floating delta re-added so the player also shows '-N energie' feedback above the bar */}
                {floatingDelta && floatingDelta.target === 'player' && (
                  <div
                    id="ftb-delta-player"
                    className={`ftb-delta--bad ftb-delta--player`}
                    aria-hidden
                  >
                    {`-${floatingDelta.value} energie`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showIntro && (
        <div id="ftb-intro-overlay" className="pz-start-overlay">
          <div id="ftb-intro-modal" className="pz-start-modal">
            <h2 id="ftb-intro-title">Speluitleg - Fight the bug</h2>
            <div id="ftb-intro-container" className="pz-start-container">
              <ul id="ftb-intro-bullets" className="pz-start-bullets">
                {INTRO_BY_AGE[effectiveAge].map((line, i) => <li key={line} id={`ftb-intro-${i}`}>{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button id="ftb-intro-next" className="pz-start-btn pz-start-btn--large" onClick={() => { setShowIntro(false); setShowPracticeStart(true) }} type="button">
                  Volgende
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPracticeStart && (
        <div id="ftb-practice-start-overlay" className="pz-start-overlay">
          <div id="ftb-practice-start-modal" className="pz-start-modal">
            <h2 id="ftb-practice-start-title">Even oefenen!</h2>
            <div id="ftb-practice-start-container" className="pz-start-container">
              <p id="ftb-practice-start-desc" style={{ marginTop: 4, marginBottom: 10 }}>De oefenronde start nu. Je score telt tijdens het oefenen nog niet mee.</p>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button id="ftb-play-practice" className="pz-start-btn pz-start-btn--large" onClick={() => { resetRun({ practice: true }); startPractice() }} type="button">
                    Spelen
                  </button>
                  <button id="ftb-skip-practice" className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { resetRun({ practice: false }); startRealGame() }} type="button">
                    Oefenronde overslaan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPracticeEnd && (
        <div id="ftb-practice-end-overlay" className="pz-start-overlay">
          <div id="ftb-practice-end-modal" className="pz-start-modal">
            <h2 id="ftb-practice-end-title">Het echte spel begint nu</h2>
            <div id="ftb-practice-end-container" className="pz-start-container">
              <p id="ftb-practice-end-desc" style={{ marginTop: 6, marginBottom: 10 }}>Je weet nu hoe het spel werkt. Succes!</p>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12, alignItems: 'center' }}>
                <button id="ftb-play-real" className="pz-start-btn pz-start-btn--large" onClick={() => { resetRun({ practice: false }); startRealGame() }} type="button">
                  Spelen
                </button>
                <button id="ftb-practice-again" className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { setShowPracticeEnd(false); setShowPracticeStart(true) }} type="button">
                  Opnieuw oefenen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div id="ftb-help-overlay" className="pz-pause-overlay">
          <div id="ftb-help-modal" className="pz-pause-modal pz-hint-modal">
            <h2 id="ftb-help-title">Speluitleg - Fight the bug</h2>
            <div id="ftb-help-container" className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul id="ftb-help-bullets" className="pz-start-bullets pz-hint-bullets">
                {INTRO_BY_AGE[effectiveAge].map((line, i) => <li key={line} id={`ftb-help-${i}`} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button id="ftb-help-continue" className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHelp(false); setPaused(false) }} type="button">
                  Verder spelen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div id="ftb-hint-overlay" className="pz-pause-overlay">
          <div id="ftb-hint-modal" className="pz-pause-modal pz-hint-modal">
            <h2 id="ftb-hint-title">Hint</h2>
            <div id="ftb-hint-container" className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul id="ftb-hint-bullets" className="pz-start-bullets pz-hint-bullets">
                {hintLines.map((line, i) => <li key={line} id={`ftb-hint-${i}`} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button id="ftb-hint-continue" className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false) }} type="button">
                  Verder spelen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paused && !showPracticeEnd && !showPracticeStart && !showIntro && !showHelp && !showHint && (
        <div id="ftb-pause-overlay" className="pz-pause-overlay">
          <div id="ftb-pause-modal" className="pz-pause-modal">
            <h2 id="ftb-pause-title">Pauze</h2>
            <div id="ftb-pause-actions" className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)} type="button">Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={restartGame} type="button">Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => endGame('stop')} type="button">Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div id="ftb-end" className="pz-end">
          <div className="pz-best-top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Primary end heading moved to the top and styled in yellow as requested */}
            <h3
              id="ftb-end-top-title"
              style={{
                textAlign: 'center',
                color: '#f2b500',
                fontSize: '2.8rem',
                fontWeight: 800,
                margin: '6px 0 10px',
                textShadow: '0 1px 0 rgba(0,0,0,0.08)'
              }}
            >
              {stoppedByUser
                ? 'Spel gestopt'
                : (playerEnergy <= 0
                  ? 'De bug is ontsnapt!'
                  : 'Jij hebt de bug verslagen!')}
            </h3>
            {/* keep the top tips area (smaller) below the heading if needed */}
            <div id="ftb-end-top-tips" style={{ textAlign: 'center', margin: '6px 0 12px' }}>
              <div className="pz-tips" style={{ color: '#f2b500', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', color: '#000' }}>
                  {stoppedByUser && (
                    <li id="ftb-end-top-tip-stopped" style={{ display: 'block' }}>Je spel is gestopt en je kan opnieuw proberen.</li>
                  )}
                  {!stoppedByUser && playerEnergy <= 0 && (
                    <li id="ftb-end-top-tip-lost" style={{ display: 'block' }}>Je maakte 10 fouten, de bug heeft zijn kans gegrepen en is ervandoor!</li>
                  )}
                  {!stoppedByUser && playerEnergy > 0 && (
                    <li id="ftb-end-top-tip-won" style={{ display: 'block' }}>Je hebt alle vragen goed beantwoord en de bug uitgeschakeld!</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <div id="ftb-end-box" className="pz-end-box">
              {/* fireworks canvas (renders behind the end content) - place as direct child so
                  the shared rule `.pz-end-box > *:not(.pz-fireworks-canvas)` places the UI above it */}
              <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
              <div id="ftb-end-content" className="pz-end-content">
              <div id="ftb-end-left" className="pz-end-left">
                  <div id="ftb-score-circle" className="pz-score-circle" aria-hidden style={circleStyle}>
                    <div id="ftb-score-label" className="pz-score-label">SCORE</div>
                    <div id="ftb-score-number" className="pz-score-number">{Math.max(0, Math.round(playerEnergy))}</div>
                    <div id="ftb-score-percent" className="pz-score-percent">{Math.max(0, Math.round(playerEnergy))}%</div>
                    <div id="ftb-score-stars" className="pz-score-stars" aria-hidden>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} id={`ftb-star-${i}`} className={`pz-star ${i < starCount ? 'pz-star--filled' : 'pz-star--empty'}`} aria-hidden>
                          <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                            <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.211l8.2-1.193z" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Show number of correct and wrong answers like other games */}
                  <div id="ftb-stats-row" className="pz-stats-row">
                    <div id="ftb-stats-correct" className="pz-stats-correct">
                      <div className="shine" aria-hidden />
                      <div id="ftb-stats-correct-label" className="label">Juist</div>
                      <div id="ftb-total-correct" className="score">{totalCorrect}</div>
                    </div>
                    <div id="ftb-stats-wrong" className="pz-stats-wrong">
                      <div className="shine" aria-hidden />
                      <div id="ftb-stats-wrong-label" className="label">Fout</div>
                      <div id="ftb-total-wrong" className="score">{totalWrong}</div>
                    </div>
                  </div>

                </div>

                <div id="ftb-end-right" className="pz-end-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Place the bug image above the tips card so it is not inside the text frame */}
                  <div id="ftb-end-bug-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <img
                      id="ftb-end-bug-image"
                      src={(stoppedByUser || playerEnergy <= 0) ? WrongAnswerBugImg : BeatenBugImg}
                      alt={(stoppedByUser || playerEnergy <= 0) ? 'Bug ontsnapt' : 'Bug verslagen'}
                      style={{ maxWidth: 360, width: '100%', height: 'auto' }}
                    />
                  </div>

                  {/* Text/tips card removed as requested (was below the bug image). */}
                  {/* Keep the restart/play-again action visible for loss/stop cases below the bug image. */}
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 50 }}>
                    {(stoppedByUser || playerEnergy <= 0) && (
                      <button
                        id="btnPlayAgain"
                        className="pz-play-again"
                        onClick={restartGame}
                        type="button"
                        style={{ minWidth: 300, padding: '12px 28px', fontSize: '1.25rem' }}
                      >
                        Opnieuw spelen
                      </button>
                    )}
                  </div>
                </div>
                  </div>
                      </div>
                    </div>
                  )}
                  {/* Render feedback banner as a portal to document.body so it is never clipped
                      by positioned/overflowed parents and always appears above UI. */}
                              {mounted && feedback && createPortal(
                                <div
                                  id="ftb-banner-portal"
                                  className={`pz-feedback ${feedbackType === 'good' ? 'pz-feedback--good' : 'pz-feedback--bad'}`}
                                  role="status"
                                  aria-live="polite"
                                                        style={{
                                                          // inline styles ensure visibility even if compiled CSS overrides exist
                                                          background: feedbackType === 'good'
                                                            ? 'linear-gradient(180deg, #4caf50, #388e3c)'
                                                            : 'linear-gradient(180deg, #f44336, #d32f2f)',
                                                          color: '#fff',
                                                          padding: '0.6rem 1rem',
                                                          fontSize: '1.4rem',
                                                          borderRadius: '999px',
                                                          border: feedbackType === 'good' ? '3px solid rgba(255,255,255,0.08)' : '3px solid rgba(0,0,0,0.12)',
                                                          boxShadow: feedbackType === 'good' ? '0 4px 12px rgba(0,0,0,0.35)' : '0 4px 12px rgba(0,0,0,0.45)',
                                                          zIndex: 9999,
                                                          position: 'fixed',
                                                          left: '50%',
                                                          // place the feedback slightly below the top chrome so it appears within the game area
                                                          top: 'calc(var(--nav-height, 64px) + 48px)',
                                                          transform: 'translateX(-50%)',
                                                          whiteSpace: 'nowrap'
                                                        }}
                                >
                                  {feedback}
                                </div>,
                                document.body
                              )}
                  </div>
                </div>
  )
}

