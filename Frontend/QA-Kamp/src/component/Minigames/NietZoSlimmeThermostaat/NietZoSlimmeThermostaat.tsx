import React, { useEffect, useMemo, useRef, useState } from 'react'
import './NietZoSlimmeThermostaat.css'
import '../PasswordZapper/PasswordZapperGame.css'
// background image for thermostat (correct assets path)
import bgThermostaat from '../../../assets/NietZoSlimmeThermostaatImages/BackgroundThermostat.png'
import ThermostaatError from '../../../assets/NietZoSlimmeThermostaatImages/ThermostaatError.png'
// new warning image requested by designer
import WarningImg from '../../../assets/NietZoSlimmeThermostaatImages/warning.png'
import officeBackgroundPng from '../../../assets/NietZoSlimmeThermostaatImages/BackgroundThermostaat.png'
import officePrinterPng from '../../../assets/NietZoSlimmeThermostaatImages/Printer.png'
import officeComputerSvg from '../../../assets/iconsPrinterSlaatOpHol/Computer.svg'
// icons for 8-10 option images
import RegenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/RegenIcon.svg'
import NachtIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/NachtIcon.svg'
import KoudIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/KoudIcon.svg'
import WarmIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/WarmIcon.svg'
import DagIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/DagIcon.svg'
import LampIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/LampIcon.svg'
import PersoonIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/PersoonIcon.svg'
import RookIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/RookIcon.svg'
import RadioIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/RadioIcon.svg'
import SlaapIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/SlaapIcon.svg'
import ProgrammaIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/ProgrammaIcon.svg'
import HuisIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/HuisIcon.svg'
import EtenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/EtenIcon.svg'
import DouchenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/DouchenIcon.svg'
import DeWasIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/DeWasIcon.svg'
import DeurIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/DeurIcon.svg'
import BuitenSpelenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/BuitenSpelenIcon.svg'
import BewegingIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/BewegingIcon.svg'
import BatterijIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/BatterijIcon.svg'
import VensterIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/VensterIcon.svg'
import VraagIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/VraagIcon.svg'
import TVIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/TVIcon.svg'
import TekenenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/TekenenIcon.svg'
import ZingIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/ZingIcon.svg'
import WaterIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/WaterIcon.svg'


type AgeGroup = '8-10' | '11-13' | '14-16'
type EndResults = { score: number; timeMs: number; mistakes: number }

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: EndResults) => void
}

type Block = {
  id: string
  label: string
  icon?: string // only for 8-10
}

type Scenario = {
  id: string
  // sentence parts
  leftKeyword: 'ALS' | 'IF'
  andKeyword?: 'EN' | 'AND'
  thenKeyword: 'DAN' | 'THEN'
  elseKeyword?: 'ELSE'
  fixedLeft?: string
  // when the scenario uses two conditions with a blank, we may render the
  // blank before or after the AND token. If blankPosition is 'before', the
  // dropzone is placed before the AND and `fixedRight` holds the text after
  // AND. If blankPosition is 'after', `fixedLeft` holds the left text and the
  // dropzone comes after AND.
  fixedRight?: string
  blankPosition?: 'before' | 'after'
  fixedAction: string
  fixedElse?: string
  // options and correct
  options: Block[]
  correctOptionId: string
}

function inferAgeGroup(value?: string | null): AgeGroup {
  const raw = String(value || '').toLowerCase()
  try {
    // explicit range patterns like "8-10", "11 - 13", "14/16"
    if (/8\D*10/.test(raw)) return '8-10'
    if (/11\D*13/.test(raw)) return '11-13'
    if (/14\D*16/.test(raw)) return '14-16'

    // if there are digits, use the first number to determine bucket
    const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
    if (nums.length >= 1) {
      const n = nums[0]
      if (n <= 10) return '8-10'
      if (n <= 13) return '11-13'
      return '14-16'
    }

    // loose checks for textual mentions
    if (raw.includes('8')) return '8-10'
    if (raw.includes('11') || raw.includes('12') || raw.includes('13')) return '11-13'
    if (raw.includes('14') || raw.includes('15') || raw.includes('16')) return '14-16'
  } catch {
    /* fall through to default */
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
    'Sleep de juiste plaatjes naar de lege vakjes.',
    'Maak een goede zin met ALS … EN … DAN …',
    'Kijk goed na of je zin klopt'
  ],
  '11-13': [
    'Sleep de juiste blokken naar de lege vakjes.',
    'Maak een goede zin met ALS … EN … DAN …',
    'Controleer of je logica klopt voor elke situatie.'
  ],
  '14-16': [
    'Je krijgt een stukje code dat niet volledig is.',
    'Maak een regel met IF … AND … THEN … ELSE …',
    'Controleer of je logica klopt voor elke situatie.'
  ]
}

const HINT_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': ['De lamp moet aan in de nacht.'],
  '11-13': ['De lamp moet aan in de nacht'],
  '14-16': ['De lamp moet aan in de nacht']
}

const END_TIP_BY_AGE: Record<AgeGroup, string> = {
  '8-10': 'Lees de zin hardop: klopt het nog steeds?',
  '11-13': 'Kijk goed naar ALS/EN/DAN en controleer de betekenis van je keuze.',
  '14-16': 'Controleer de logica: welke conditie hoort bij THEN en wat gebeurt er in ELSE?'
}

const POSITIVE_FEEDBACK = ['Goed!', 'Top!', 'Super!', 'Helemaal juist!', 'Nice!']
const NEGATIVE_FEEDBACK = ['Fout!', 'Helaas!', 'Probeer opnieuw.']

function randFrom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

function computePercent(correct: number, wrong: number) {
  const total = correct + wrong
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)))
}

function computeStars(percent: number) {
  const pct = Math.max(0, Math.min(100, percent))
  if (pct === 100) return 3
  if (pct >= 66) return 2
  if (pct >= 33) return 1
  return 0
}

function buildScenarioPool(age: AgeGroup): Scenario[] {
  // Build an explicit, larger pool of scenarios based on the lists provided
  // for the three age-groups (thermostat-focused and other smart-device
  // scenarios). Each group mixes the small-vocabulary options the UI expects
  // with descriptive actions.

  if (age === '8-10') {
    // Thermostat-focused vocabulary (kept short and kid-friendly)
    const thermoOptions: Block[] = [
      { id: 'rain', label: 'het regent', icon: RegenIcon },
      { id: 'night', label: 'het nacht is', icon: NachtIcon },
      { id: 'cold', label: 'het koud is', icon: KoudIcon },
      { id: 'warm', label: 'het warm is', icon: WarmIcon },
      { id: 'day', label: 'het dag is', icon: DagIcon },
      // supplementary icons for 8-10 variants
      { id: 'light', label: 'het licht is', icon: LampIcon },
      { id: 'tv', label: 'de tv is aan', icon: TVIcon },
      { id: 'person', label: 'er is iemand', icon: PersoonIcon },
      { id: 'window', label: 'het raam is open', icon: VensterIcon },
      { id: 'battery', label: 'de batterij is bijna leeg', icon: BatterijIcon }
    ]

    // Helper removed: thermostat scenarios are defined explicitly below.

    // Explicit thermostat scenarios for 8-10 matching the provided table.
    const thermostatScenarios: Scenario[] = [
      // 1 ALS ___ DAN zet de lamp aan (correct: het nacht is)
      { id: 't1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: thermoOptions, correctOptionId: 'night' },
      // 2 ALS ___ DAN zet de lamp uit (correct: het dag is)
      { id: 't2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: thermoOptions, correctOptionId: 'day' },
      // 3 ALS ___ DAN zet de verwarming aan (correct: het koud is)
      { id: 't3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: thermoOptions, correctOptionId: 'cold' },
      // 4 ALS ___ DAN zet de verwarming uit (correct: het warm is)
      { id: 't4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: thermoOptions, correctOptionId: 'warm' },

      // 5 ALS ___ EN het regent DAN zet de lamp aan (blank before EN -> fixedRight)
      { id: 't5', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: thermoOptions, correctOptionId: 'night' },
      // 6 ALS het nacht is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't6', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: thermoOptions, correctOptionId: 'rain' },
      // 7 ALS ___ EN het dag is DAN zet de lamp uit (blank before EN)
      { id: 't7', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: thermoOptions, correctOptionId: 'warm' },
      // 8 ALS het dag is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't8', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[3]], correctOptionId: 'rain' },
      // 9 ALS ___ EN het regent DAN zet de verwarming aan (blank before EN)
      { id: 't9', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: thermoOptions, correctOptionId: 'cold' },
      // 10 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't10', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[3], thermoOptions[4]], correctOptionId: 'night' },
      // 11 ALS ___ EN het dag is DAN zet de verwarming uit (blank before EN)
      { id: 't11', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: thermoOptions, correctOptionId: 'warm' },
      // 12 ALS het warm is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't12', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[4]], correctOptionId: 'day' },
      // 13 ALS ___ EN het koud is DAN zet de verwarming aan (blank before EN)
      { id: 't13', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: thermoOptions, correctOptionId: 'day' },
      // 14 ALS het nacht is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't14', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 15 ALS ___ EN het warm is DAN zet de verwarming uit (blank before EN)
      { id: 't15', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: thermoOptions, correctOptionId: 'rain' },
      // 16 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't16', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: thermoOptions, correctOptionId: 'rain' },
      // 17 ALS het regent EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't17', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[4], thermoOptions[1], thermoOptions[2], thermoOptions[3]], correctOptionId: 'day' },
      // 18 ALS het regent EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't18', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[3], thermoOptions[2], thermoOptions[1], thermoOptions[4]], correctOptionId: 'warm' },
      // 19 ALS het nacht is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't19', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[2], thermoOptions[3], thermoOptions[4], thermoOptions[0]], correctOptionId: 'warm' },
      // 20 ALS het dag is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't20', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[3], thermoOptions[2], thermoOptions[1]], correctOptionId: 'cold' },
      // 21 ALS het warm is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't21', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [thermoOptions[2], thermoOptions[4], thermoOptions[1], thermoOptions[0]], correctOptionId: 'night' },
      // 22 ALS het koud is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't22', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[1], thermoOptions[4], thermoOptions[3], thermoOptions[0]], correctOptionId: 'day' }
    ]

    // Other smart-home scenarios for 8-10; use a broader options list
    const deviceOptions: Block[] = [
      { id: 'cold', label: 'het koud is', icon: KoudIcon },
      { id: 'warm', label: 'het warm is', icon: WarmIcon },
      { id: 'light', label: 'het licht is', icon: LampIcon },
      { id: 'tv_on', label: 'de tv aan staat', icon: TVIcon },
      { id: 'doorbell', label: 'iemand aanbelt', icon: DeurIcon },
      { id: 'sunrise', label: 'de zon opkomt', icon: DagIcon },
      { id: 'dark', label: 'het donker wordt', icon: NachtIcon },
      { id: 'morning', label: 'het ochtend is', icon: DagIcon },
      { id: 'radio', label: 'de radio speelt', icon: RadioIcon },
      { id: 'device_not_used', label: 'het apparaat niet gebruikt wordt', icon: VraagIcon },
      { id: 'window_open', label: 'het raam open is', icon: VensterIcon },
      { id: 'washing_done', label: 'de was klaar is', icon: DeWasIcon },
      { id: 'program_done', label: 'het programma klaar is', icon: ProgrammaIcon },
      { id: 'bedtime', label: 'het bedtijd is', icon: SlaapIcon },
      { id: 'shower', label: 'je gaat douchen', icon: DouchenIcon },
      { id: 'water_excess', label: 'er te veel water loopt', icon: WaterIcon },
      { id: 'smoke', label: 'er rook is', icon: RookIcon },
      { id: 'fridge_open', label: 'de deur te lang openstaat', icon: DeurIcon },
      { id: 'everyone_away', label: 'iedereen weg is', icon: HuisIcon },
      { id: 'someone_walks', label: 'iemand langsloopt', icon: PersoonIcon },
      { id: 'nobody_home', label: 'niemand thuis is', icon: HuisIcon },
      { id: 'battery_low', label: 'de batterij bijna leeg is', icon: BatterijIcon },
      { id: 'movement', label: 'er beweging is', icon: BewegingIcon },
      { id: 'someone_enters', label: 'iemand binnenkomt', icon: PersoonIcon },
      { id: 'you_enter', label: 'je binnenkomt', icon: PersoonIcon },
      { id: 'lights_on', label: 'het licht nog brandt', icon: LampIcon },
      { id: 'bedtime_b', label: 'het bedtijd is', icon: SlaapIcon },
      { id: 'temperature_too_high', label: 'Temperatuur te hoog is', icon: WarmIcon },
      { id: 'nobodyhome', label: 'niemand thuis is', icon: HuisIcon },
      // extra playful options (used by some scenarios as inline blocks)
      { id: 'eet', label: 'je eet', icon: EtenIcon },
      { id: 'buiten', label: 'je buiten speelt', icon: BuitenSpelenIcon },
      { id: 'tekent', label: 'je tekent', icon: TekenenIcon },
      { id: 'zingt', label: 'je zingt', icon: ZingIcon }
    ]

    // Device single-condition helper: do not set `andKeyword` by default.
    const devMk = (id: string, fixedLeft: string, correct: Block['id'], action: string): Scenario => ({
      id,
      leftKeyword: 'ALS',
      thenKeyword: 'DAN',
      fixedLeft,
      fixedAction: action,
      options: deviceOptions,
      correctOptionId: correct
    })

    const deviceScenarios: Scenario[] = [
      devMk('d1', 'het koud is', 'cold', 'gaat de verwarming aan'),
      devMk('d2', 'het warm is', 'warm', 'gaat de airco aan'),
      devMk('d3', 'het donker is', 'dark', 'gaat de lamp aan'),
      devMk('d4', 'het licht is', 'light', 'gaat de lamp uit'),
      devMk('d5', 'het warm genoeg is', 'warm', 'gaat de thermostaat lager'),
      devMk('d6', 'het te koud is', 'cold', 'gaat de thermostaat hoger'),
      devMk('d7', 'iemand aanbelt', 'doorbell', 'gaat de slimme deurbel af'),
      devMk('d8', 'de zon opkomt', 'sunrise', 'gaan de gordijnen open'),
      devMk('d9', 'het donker wordt', 'dark', 'gaan de gordijnen dicht'),
      devMk('d10', 'het ochtend is', 'morning', 'gaat de slimme wekker af'),
      devMk('d11', 'de radio niet gebruikt wordt', 'device_not_used', 'gaat de slimme stekker uit'),
      devMk('d12', 'het warm is', 'warm', 'gaat de ventilator aan'),
      devMk('d13', 'het koud genoeg is', 'cold', 'gaat de ventilator uit'),
      devMk('d14', 'je een vraag stelt', 'you_enter', 'gaat de slimme speaker praten'),
      devMk('d15', 'niemand thuis is', 'nobody_home', 'gaat de robotstofzuiger aan'),
      devMk('d16', 'de batterij bijna leeg is', 'battery_low', 'stopt de robotstofzuiger'),
      devMk('d17', 'er beweging is', 'movement', 'gaat de slimme camera opnemen'),
      devMk('d18', 'iemand langsloopt', 'someone_walks', 'gaat het buitenlicht aan'),
      devMk('d19', 'het raam open is', 'window_open', 'gaat de verwarming lager'),
      devMk('d20', 'de was klaar is', 'washing_done', 'gaat de wasmachine klaar-melding aan'),
      devMk('d21', 'het programma klaar is', 'program_done', 'gaat de vaatwasser uit'),
      devMk('d22', 'het bedtijd is', 'bedtime', 'gaat de slimme lamp zacht branden'),
      devMk('d23', 'je gaat douchen', 'shower', 'gaat de verwarming aan in de badkamer'),
      devMk('d24', 'er te veel water loopt', 'water_excess', 'gaat de slimme kraan uit'),
      devMk('d25', 'er rook is', 'smoke', 'gaat de rookmelder af'),
      devMk('d26', 'de deur te lang openstaat', 'fridge_open', 'gaat de slimme koelkast piepen'),
      devMk('d27', 'iedereen weg is', 'everyone_away', 'gaat de thermostaat op eco-stand'),
      devMk('d28', 'je binnenkomt en het donker is', 'you_enter', 'gaat de ganglamp aan'),
      devMk('d29', 'je thuis bent en het koud is', 'you_enter', 'gaat de verwarming aan'),
      devMk('d30', 'je thuis bent en het warm is', 'you_enter', 'gaat de airco aan')
    ]

    return [...thermostatScenarios, ...deviceScenarios]
  }

  if (age === '11-13') {
    // For 11-13 we need a mix of single-condition (ALS ... DAN) and two-condition
    // (ALS ... EN ... DAN) scenarios. Some scenarios have the blank before EN,
    // others after EN. We'll build explicit scenarios matching the provided
    // table. Options are provided per scenario (subset of the main options when
    // specified).
    const baseOptions: Record<string, Block> = {
      rain: { id: 'rain', label: 'het regent' },
      night: { id: 'night', label: 'het nacht is' },
      cold: { id: 'cold', label: 'het koud is' },
      warm: { id: 'warm', label: 'het warm is' },
      day: { id: 'day', label: 'het dag is' }
    }

    const thermostat: Scenario[] = [
      // 1 ALS ___ DAN zet de lamp aan (correct: night)
      { id: 't1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 2 ALS ___ DAN zet de lamp uit (correct: day)
      { id: 't2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'day' },
      // 3 ALS ___ DAN zet de verwarming aan (correct: cold)
      { id: 't3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 4 ALS ___ DAN zet de verwarming uit (correct: warm)
      { id: 't4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'warm' },

      // 5 ALS ___ EN het regent DAN zet de lamp aan (blank before EN => fixedRight)
      { id: 't5', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 6 ALS het nacht is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't6', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'rain' },
      // 7 ALS ___ EN het dag is DAN zet de lamp uit (blank before EN)
      { id: 't7', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'warm' },
      // 8 ALS het dag is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't8', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.rain, baseOptions.night, baseOptions.warm], correctOptionId: 'rain' },
      // 9 ALS ___ EN het regent DAN zet de verwarming aan (blank before EN)
      { id: 't9', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 10 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't10', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 11 ALS ___ EN het dag is DAN zet de verwarming uit (blank before EN)
      { id: 't11', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'warm' },
      // 12 ALS het warm is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't12', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.day], correctOptionId: 'day' },
      // 13 ALS ___ EN het koud is DAN zet de verwarming aan (blank before EN)
      { id: 't13', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.warm, baseOptions.day], correctOptionId: 'day' },
      // 14 ALS het nacht is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't14', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 15 ALS ___ EN het warm is DAN zet de verwarming uit (blank before EN)
      { id: 't15', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.day], correctOptionId: 'rain' },
      // 16 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't16', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.warm, baseOptions.day], correctOptionId: 'rain' },
      // 17 ALS het regent EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't17', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.day, baseOptions.night, baseOptions.cold, baseOptions.warm], correctOptionId: 'day' },
      // 18 ALS het regent EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't18', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.warm, baseOptions.cold, baseOptions.night, baseOptions.day], correctOptionId: 'warm' },
      // 19 ALS het nacht is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't19', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.cold, baseOptions.warm, baseOptions.day, baseOptions.rain], correctOptionId: 'warm' },
      // 20 ALS het dag is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't20', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.warm, baseOptions.cold, baseOptions.night], correctOptionId: 'cold' },
      // 21 ALS het warm is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't21', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.cold, baseOptions.day, baseOptions.night, baseOptions.rain], correctOptionId: 'night' },
      // 22 ALS het koud is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't22', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.night, baseOptions.day, baseOptions.warm, baseOptions.rain], correctOptionId: 'day' }
    ]

    // Other smart-device scenarios for 11-13 (use devOptions base and per-row option subsets)
    const devBase: Record<string, Block> = {
      hot: { id: 'hot', label: 'het warm is' },
      doorbell: { id: 'doorbell', label: 'iemand aanbelt' },
      sunrise: { id: 'sunrise', label: 'de zon opkomt' },
      dark: { id: 'dark', label: 'het donker wordt' },
      device_not_used: { id: 'device_not_used', label: 'het apparaat niet gebruikt wordt' },
      window_open: { id: 'window_open', label: 'het raam open is' },
      washing_done: { id: 'washing_done', label: 'de was klaar is' },
      program_done: { id: 'program_done', label: 'het programma klaar is' },
      bedtime: { id: 'bedtime', label: 'het bedtijd is' },
      smoke: { id: 'smoke', label: 'er rook is' },
      fridge_open: { id: 'fridge_open', label: 'de deur te lang openstaat' },
      everyone_away: { id: 'everyone_away', label: 'iedereen weg is' },
      movement: { id: 'movement', label: 'er beweging is' },
      you_enter: { id: 'you_enter', label: 'je binnenkomt' },
      nobody_home: { id: 'nobody_home', label: 'niemand thuis is' },
      battery_low: { id: 'battery_low', label: 'de batterij bijna leeg is' }
    }

    const deviceScenarios: Scenario[] = [
      { id: 'd1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [devBase.hot, devBase.cold, devBase.dark, devBase.doorbell], correctOptionId: 'hot' },
      { id: 'd2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme deurbel af', options: [devBase.doorbell, baseOptions.rain, devBase.hot, devBase.dark], correctOptionId: 'doorbell' },
      { id: 'd3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen open', options: [devBase.sunrise, devBase.dark, devBase.cold, devBase.washing_done], correctOptionId: 'sunrise' },
      { id: 'd4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen dicht', options: [devBase.dark, devBase.bedtime, devBase.hot, devBase.doorbell], correctOptionId: 'dark' },
      { id: 'd5', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme stekker uit', options: [devBase.device_not_used, devBase.cold, devBase.dark, devBase.sunrise], correctOptionId: 'device_not_used' },
      { id: 'd6', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de ventilator aan', options: [devBase.hot, devBase.cold, devBase.dark, devBase.doorbell], correctOptionId: 'hot' },
      { id: 'd7', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme speaker praten', options: [devBase.you_enter, devBase.cold, devBase.rain, devBase.dark], correctOptionId: 'you_enter' },
      { id: 'd8', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de robotstofzuiger aan', options: [devBase.nobody_home, devBase.everyone_away, devBase.rain, devBase.cold], correctOptionId: 'nobody_home' },
      { id: 'd9', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'stopt de robotstofzuiger', options: [devBase.battery_low, devBase.hot, devBase.dark, devBase.doorbell], correctOptionId: 'battery_low' },
      { id: 'd10', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme camera opnemen', options: [devBase.movement, devBase.hot, devBase.dark, devBase.doorbell], correctOptionId: 'movement' },
      { id: 'd11', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat het buitenlicht aan', options: [devBase.you_enter, devBase.hot, devBase.cold, devBase.washing_done], correctOptionId: 'you_enter' },
      { id: 'd12', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming lager', options: [devBase.window_open, devBase.device_not_used, devBase.doorbell, devBase.program_done], correctOptionId: 'window_open' },
      { id: 'd13', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de wasmachine-melding aan', options: [devBase.washing_done, devBase.dark, devBase.hot, devBase.you_enter], correctOptionId: 'washing_done' },
      { id: 'd14', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de vaatwasser uit', options: [devBase.program_done, devBase.cold, devBase.sunrise, devBase.doorbell], correctOptionId: 'program_done' },
      { id: 'd15', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme lamp zacht branden', options: [devBase.bedtime, { id: 'middag', label: 'het middag is' } as Block, devBase.hot, devBase.doorbell], correctOptionId: 'bedtime' },
      { id: 'd16', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de rookmelder af', options: [devBase.smoke, devBase.rain, devBase.hot, devBase.dark], correctOptionId: 'smoke' },
      { id: 'd17', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme koelkast piepen', options: [devBase.fridge_open, devBase.dark, devBase.cold, devBase.doorbell], correctOptionId: 'fridge_open' },
      { id: 'd18', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de thermostaat op eco-stand', options: [devBase.everyone_away, devBase.nobody_home, devBase.hot, devBase.dark], correctOptionId: 'everyone_away' },
      // 19 ALS ___ EN het is donker DAN gaat de ganglamp aan (blank before EN)
      { id: 'd19', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is donker', thenKeyword: 'DAN', fixedAction: 'gaat de ganglamp aan', options: [devBase.you_enter, { id: 'slaapt', label: 'je slaapt' } as Block, { id: 'eet', label: 'je eet' } as Block, { id: 'tekent', label: 'je tekent' } as Block], correctOptionId: 'you_enter' },
      // 20 ALS ___ EN het is koud DAN gaat de verwarming aan (blank before EN)
      { id: 'd20', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is koud', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming aan', options: [ { id: 'thuis', label: 'je thuis bent' } as Block, { id: 'buiten', label: 'je buiten speelt' } as Block, devBase.window_open, devBase.sunrise ], correctOptionId: 'thuis' },
      // 21 ALS ___ EN het is warm DAN gaat de airco aan (blank before EN)
      { id: 'd21', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is warm', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [ { id: 'thuis', label: 'je thuis bent' } as Block, devBase.nobody_home, devBase.window_open, { id: 'sneeuwt', label: 'het sneeuwt' } as Block ], correctOptionId: 'thuis' },
      // 22 ALS ___ EN het donker wordt DAN gaat het buitenlicht aan (blank before EN)
      { id: 'd22', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het donker wordt', thenKeyword: 'DAN', fixedAction: 'gaat het buitenlicht aan', options: [devBase.movement, devBase.program_done, { id: 'sneeuwt2', label: 'het sneeuwt' } as Block, devBase.bedtime], correctOptionId: 'movement' },
      // 23 ALS ___ EN de batterij bijna leeg is DAN stopt de robotstofzuiger (blank before EN)
      { id: 'd23', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'de batterij bijna leeg is', thenKeyword: 'DAN', fixedAction: 'stopt de robotstofzuiger', options: [ { id: 'schoonmaakt', label: 'hij aan het schoonmaken is' } as Block, devBase.rain, devBase.bedtime, devBase.fridge_open ], correctOptionId: 'schoonmaakt' },
      // 24 ALS ___ EN niemand thuis is DAN schakelt de slimme verlichting uit (blank before EN)
      { id: 'd24', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'niemand thuis is', thenKeyword: 'DAN', fixedAction: 'schakelt de slimme verlichting uit', options: [ { id: 'licht_brandt', label: 'het licht nog brandt' } as Block, devBase.cold, devBase.sunrise, { id: 'kookt', label: 'iemand kookt' } as Block ], correctOptionId: 'licht_brandt' },
      // 25 ALS ___ EN het raam openstaat DAN gaat de verwarming lager (blank before EN)
      { id: 'd25', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het raam openstaat', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming lager', options: [baseOptions.day, devBase.program_done, baseOptions.rain, devBase.dark], correctOptionId: 'cold' }
    ]

    return [...thermostat, ...deviceScenarios]
  }

  // 14-16: code-like conditions with THEN/ELSE
  const options14: Block[] = [
    { id: 'IsRaining', label: 'IsRaining' },
    { id: 'IsNight', label: 'IsNight' },
    { id: 'IsCold', label: 'IsCold' },
    { id: 'IsHot', label: 'IsHot' },
    { id: 'IsDay', label: 'IsDay' },
    { id: 'MotionDetected', label: 'MotionDetected' },
    { id: 'NobodyHome', label: 'NobodyHome' },
    { id: 'BatteryLow', label: 'BatteryLow' },
    { id: 'DoorbellPressed', label: 'DoorbellPressed' },
    { id: 'FridgeDoorOpen', label: 'FridgeDoorOpen' },
    { id: 'WashingDone', label: 'WashingDone' },
    { id: 'AirQualityBad', label: 'AirQualityBad' },
    { id: 'WaterLeakDetected', label: 'WaterLeakDetected' },
    { id: 'TemperatureTooHigh', label: 'TemperatureTooHigh' }
  ]

  const mk14 = (id: string, fixedLeft: string, correct: Block['id'], thenAction: string, elseAction = ''): Scenario => ({
    id,
    leftKeyword: 'IF',
    andKeyword: 'AND',
    thenKeyword: 'THEN',
    elseKeyword: elseAction ? 'ELSE' : undefined,
    fixedLeft,
    fixedAction: thenAction,
    fixedElse: elseAction,
    options: options14,
    correctOptionId: correct
  })

  return [
    mk14('c1', 'UserHome', 'IsNight', 'turnLampOn()', 'turnLampOff()'),
    mk14('c2', 'NeedsHeating', 'IsCold', 'turnHeatingOn()', 'turnHeatingOff()'),
    mk14('c3', 'NeedsCooling', 'IsHot', 'turnAircoOn()', 'turnAircoOff()'),
    mk14('c4', 'Outside', 'IsRaining', 'TakeUmbrella()', 'GoOutside()'),
    mk14('c5', 'Daylight', 'IsDay', 'turnLampOff()', 'turnLampOn()'),
    mk14('c6', 'Security', 'MotionDetected', 'turnLampOn()', 'turnLampOff()'),
    mk14('c7', 'AwayMode', 'NobodyHome', 'turnHeatingOff()', 'turnHeatingOn()'),
    mk14('c8', 'BinLow', 'BatteryLow', 'returnToDock()', ''),
    mk14('c9', 'DoorEvent', 'DoorbellPressed', 'sendNotification()', ''),
    mk14('c10', 'FridgeWatch', 'FridgeDoorOpen', 'sendWarning()', ''),
    mk14('c11', 'Laundry', 'WashingDone', 'sendNotification()', ''),
    mk14('c12', 'AirQuality', 'AirQualityBad', 'startAirPurifier()', ''),
    mk14('c13', 'Leak', 'WaterLeakDetected', 'shutOffWater()', ''),
    mk14('c14', 'TempControl', 'TemperatureTooHigh', 'startAirco()', ''),
    mk14('c15', 'SecurityNight', 'IsNight', 'activateSecurityMode()', '')
  ]
}

function pickNextScenario(pool: Scenario[], lastId?: string) {
  if (pool.length <= 1) return pool[0]
  // try to avoid immediate repeats
  for (let i = 0; i < 6; i++) {
    const s = pool[Math.floor(Math.random() * pool.length)]
    if (s.id !== lastId) return s
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function NietZoSlimmeThermostaat({ ageGroup, onEnd }: Props) {
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

  const introText = INTRO_BY_AGE[effectiveAge]

  const pool = useMemo(() => buildScenarioPool(effectiveAge), [effectiveAge])

  const isTestEnv = typeof process !== 'undefined' && (process as unknown as { env?: Record<string, string> }).env?.NODE_ENV === 'test'
  const [showOfficeIntro, setShowOfficeIntro] = useState(!isTestEnv)
  // intermediate catastrophe popup shown after clicking the thermostat in the
  // office intro and before the normal intro modal. Starts false and is only
  // enabled when the player clicks the thermostat overlay.
  const [showCatastrophe, setShowCatastrophe] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [showPracticeStart, setShowPracticeStart] = useState(false)
  const [showPracticeEnd, setShowPracticeEnd] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
  const [practiceCorrect, setPracticeCorrect] = useState(0)

  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)

  const [score, setScore] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  // DOM refs for badge width syncing
  const scoreBadgeRef = useRef<HTMLDivElement | null>(null)
  const feedbackBadgeRef = useRef<HTMLDivElement | null>(null)
  // fireworks canvas ref (used to render celebratory fireworks on end screen)
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // lock to prevent multiple rapid submissions for the same scenario
  const checkingRef = useRef(false)
  const wrongInRoundRef = useRef(0)

  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { correctRef.current = totalCorrect }, [totalCorrect])
  useEffect(() => { wrongRef.current = totalWrong }, [totalWrong])

  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  // Sync feedback badge width to the main score badge so both are the same width
  useEffect(() => {
    function updateWidth() {
      try {
        const w = scoreBadgeRef.current ? scoreBadgeRef.current.getBoundingClientRect().width : 0
        if (feedbackBadgeRef.current) {
          if (w && (answerState === 'correct' || answerState === 'wrong')) {
            feedbackBadgeRef.current.style.width = `${w}px`
          } else {
            // clear explicit width so it collapses when not shown
            feedbackBadgeRef.current.style.width = ''
          }
        }
      } catch { /* ignore measurement errors */ }
    }

    // update immediately and when window resizes while feedback is visible
    updateWidth()
    if (answerState === 'correct' || answerState === 'wrong') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
    return undefined
  }, [answerState, score, isPractice])


  const [currentScenario, setCurrentScenario] = useState<Scenario>(() => pickNextScenario(pool))
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  // Compute which options are visible to the player: always include the
  // correct option and pick up to 4 other unique incorrect options (max 5
  // displayed). Shuffle the final list so the correct answer isn't always
  // in the same place. This implementation is defensive against malformed
  // scenario/pool data (e.g. undefined entries) which previously caused a
  // runtime TypeError.
  const visibleOptions = useMemo(() => {
    try {
      const optsRaw = currentScenario?.options || []
      const opts: Block[] = Array.isArray(optsRaw) ? optsRaw.filter(Boolean) as Block[] : []
      const correctId = currentScenario?.correctOptionId

      // Find correct option defensively
      let correctOpt: Block | null = null
      if (correctId) {
        correctOpt = opts.find((o) => !!o && o.id === correctId) ?? null
      }

      // Search the global pool if not found in this scenario
      if (!correctOpt && correctId && Array.isArray(pool)) {
        for (const s of pool) {
          if (!s || !Array.isArray(s.options)) continue
          const found = s.options.filter(Boolean).find((o) => o.id === correctId)
          if (found) { correctOpt = found; break }
        }
      }

      // Last-resort fallback
      if (!correctOpt && correctId) correctOpt = { id: correctId, label: String(correctId) }

      // Build incorrect pool defensively
      const incorrectPool: Block[] = opts.filter((o) => !!o && o.id !== correctId)

      if (incorrectPool.length < 4 && Array.isArray(pool)) {
        const extra: Block[] = []
        const usedIds = new Set<string>(incorrectPool.map((o) => o.id))
        if (correctOpt) usedIds.add(correctOpt.id)
        for (const s of pool) {
          if (!s || !Array.isArray(s.options)) continue
          const sOpts = s.options.filter(Boolean) as Block[]
          for (const b of sOpts) {
            if (!b || !b.id) continue
            if (usedIds.has(b.id)) continue
            usedIds.add(b.id)
            extra.push(b)
            if (extra.length + incorrectPool.length >= 4) break
          }
          if (extra.length + incorrectPool.length >= 4) break
        }
        incorrectPool.push(...extra)
      }

      // Shuffle incorrects and pick up to 4
      const shuffledIncorrect = [...incorrectPool].sort(() => Math.random() - 0.5).slice(0, 4)

      const combined = correctOpt ? [correctOpt, ...shuffledIncorrect] : shuffledIncorrect.slice(0, 5)

      // final shuffle so correct answer position varies
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[combined[i], combined[j]] = [combined[j], combined[i]]
      }
      return combined
    } catch (e) {
      try { console.warn('visibleOptions build failed', e) } catch { /* ignore */ }
      return Array.isArray(currentScenario?.options) ? (currentScenario!.options!.filter(Boolean) as Block[]) : []
    }
  }, [currentScenario, pool])

  const hintAutoShownRef = useRef(false)
  const lastScenarioIdRef = useRef<string | undefined>(undefined)

  const percent = useMemo(() => computePercent(totalCorrect, totalWrong), [totalCorrect, totalWrong])
  const starCount = useMemo(() => computeStars(percent), [percent])
  const circleStyle = useMemo(
    () => ({ ['--pz-score-pct' as unknown as string]: `${percent}%` } as unknown as React.CSSProperties),
    [percent]
  )

  const localHighKey = useMemo(() => `pz-highscore_thermostaat_${effectiveAge}`, [effectiveAge])
  const [highScore, setHighScore] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(localHighKey)
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  })
  const [isNewHigh, setIsNewHigh] = useState(false)

  // compute hint text per round based on the current scenario and age group
  const computedHint = useMemo<string[]>(() => {
    try {
      const s = currentScenario
      if (!s) return HINT_BY_AGE[effectiveAge] || []

      // find the correct option label (if present) in a defensive way
      const sOpts = Array.isArray(s.options) ? s.options.filter(Boolean) as Block[] : []
      const correctOpt = sOpts.find((o) => !!o && o.id === s.correctOptionId)
      const condLabel = (correctOpt && correctOpt.label) ? String(correctOpt.label).trim() : ''

      // helper map for extra contextual explanation (Dutch phrasing)
      const extraMap: Record<string, string> = {
        'het warm is': 'dan ga je zweten.',
        'het koud is': 'dan krijg je het koud.',
        'het regent': 'dan neem je een paraplu mee.',
        'het dag is': 'dan is het licht.',
        'het nacht is': 'dan is het donker.',
        'het is warm': 'dan ga je zweten.',
        'het is koud': 'dan krijg je het koud.',
        'het is dag': 'dan is het licht.',
        'het is nacht': 'dan is het donker.',
        'iswarm': 'dan ga je zweten.',
        'iscold': 'dan krijg je het koud.',
        'israining': 'dan neem je een paraplu mee.',
        'isday': 'dan is het licht.',
        'isnight': 'dan is het donker.'
      }

      if (effectiveAge === '14-16') {
        // for older kids show code-like hint with THEN/ELSE
        const lines: string[] = []
        const left = s.leftKeyword || 'IF'
        const cond = condLabel || s.correctOptionId || ''
        const thenAct = s.fixedAction || s.fixedAction === '' ? s.fixedAction : ''
        const elseAct = s.fixedElse || ''
        if (cond) lines.push(`${left} ${cond} ${s.andKeyword ? s.andKeyword : ''} ... ${s.thenKeyword} ${thenAct}`.replace(/\s+/g, ' ').trim())
        if (elseAct) lines.push(`${s.elseKeyword || 'ELSE'} ${elseAct}`)
        return lines.length ? lines : (HINT_BY_AGE[effectiveAge] || [])
      }

      // natural-language hint for younger ages
      const leftWord = s.leftKeyword === 'ALS' ? 'Als' : (s.leftKeyword || 'Als')
      const thenWord = s.thenKeyword === 'DAN' ? 'dan' : (s.thenKeyword || 'dan')
      const main = condLabel ? `${leftWord} ${condLabel}, ${thenWord} ${s.fixedAction}.` : `${leftWord} ..., ${thenWord} ${s.fixedAction}.`
      // try to find an extra explanation from map (case-insensitive)
      const key = condLabel ? condLabel.toLowerCase().replace(/\s+/g, ' ') : ''
      const extra = extraMap[key] || ''
      return extra ? [main, extra] : [main]
    } catch {
      return HINT_BY_AGE[effectiveAge] || []
    }
  }, [currentScenario, effectiveAge])

  // ensure hint button is locked at start until mistakes threshold is reached
  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [effectiveAge])

  // body class while modals are open (matches other minigames)
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

  // Fireworks canvas: initialize when end screen is shown (dynamically import
  // the fireworks initializer to avoid bundling heavy canvas code). Wait until
  // the canvas has layout size (non-zero) before initializing — some renders
  // mount the canvas but it may not yet have a computed size which caused the
  // fireworks to never draw in some games. This mirrors the robust logic used
  // in other minigames (e.g. FightTheBug/PrinterSlaatOpHol).
  useEffect(() => {
    if (!showEnd) return
    let cleanup: (() => void) | null = null
    ;(async () => {
      try {
        const canvasEl = fwCanvasRef.current
        if (!canvasEl) return

        // Wait until the canvas has a non-zero layout size (it may be hidden
        // or not laid out yet). Try a few times with small delays.
        let rect = canvasEl.getBoundingClientRect()
        let tries = 0
        while ((rect.width === 0 || rect.height === 0) && tries < 8) {
          // small delay
          await new Promise((r) => setTimeout(r, 50))
          rect = canvasEl.getBoundingClientRect()
          tries += 1
        }
        if (rect.width === 0 || rect.height === 0) {
          // give up gracefully if canvas still has no size
          return
        }

        // Try importing the fireworks module (primary and .ts fallback) and
        // initialize if it exports a default function.
        let mod: unknown = null
        try {
          mod = await import('../PasswordZapper/passwordZapperFireworks')
        } catch {
          try { mod = await import('../PasswordZapper/passwordZapperFireworks.ts') } catch { /* ignore */ }
        }

        if (!mod) return
        const maybeInit = (mod as { default?: unknown })
        if (typeof maybeInit.default === 'function') {
          cleanup = (maybeInit.default as (c: HTMLCanvasElement) => (() => void))(canvasEl)
        }
      } catch {
        // ignore failures — fireworks are decorative
      }
    })()
    return () => { try { if (cleanup) cleanup() } catch { /* ignore */ } }
  }, [showEnd])

  // listen to global controls (pause/help/hint)
  // Handlers are defined as stable callbacks so the effect only registers
  // and unregisters listeners (no setState calls directly inside the effect).
  const onPause = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  const onHelpEvt = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setShowHelp(true)
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  const onHintEvt = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    // Only open hint if it has been unlocked by mistakes threshold
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked']) return
    } catch {
      return
    }
    setShowHint(true)
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  useEffect(() => {
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelpEvt as EventListener)
    window.addEventListener('minigame:hint', onHintEvt as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelpEvt as EventListener)
      window.removeEventListener('minigame:hint', onHintEvt as EventListener)
    }
  }, [onPause, onHelpEvt, onHintEvt])

  // pause freezes gameplay: just flip running flag
  useEffect(() => {
    // The code intentionally updates the explicit running state when paused changes.
    // This triggers an extra render but is intentional for the game flow.
    if (paused) setRunning(false)
    else {
      if (!showEnd && !showIntro && !showPracticeStart && !showPracticeEnd) setRunning(true)
    }
  }, [paused, showEnd, showIntro, showPracticeStart, showPracticeEnd])

  // load local highscore
  // NOTE: high score is initialized via lazy useState above, so no effect is required.

  // Per-round hint unlock: handled inline when a wrong answer is recorded.
  // (We intentionally do not unlock based on cumulative totalWrong.)

  const openPracticeStart = () => {
    setShowIntro(false)
    setShowPracticeStart(true)
    setPaused(false)
    setRunning(false)
  }

  const startPractice = () => {
    setShowPracticeStart(false)
    setIsPractice(true)
    setPracticeCorrect(0)
    setSelectedOptionId(null)
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    setPaused(false)
    setRunning(true)
  }

  const startRealGame = () => {
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setScore(0)
    setTotalCorrect(0)
    setTotalWrong(0)
    setFeedback(null)
    setFeedbackType(null)
    setAnswerState('idle')
    setSelectedOptionId(null)
    setStoppedByUser(false)
    setShowEnd(false)
    hintAutoShownRef.current = false
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    setPaused(false)
    setRunning(true)
  }

  const restartGame = () => {
    setShowIntro(true)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setPaused(false)
    setRunning(false)
    setShowHint(false)
    setShowHelp(false)
    setShowEnd(false)
    setStoppedByUser(false)
    setScore(0)
    setTotalCorrect(0)
    setTotalWrong(0)
    setFeedback(null)
    setFeedbackType(null)
    setAnswerState('idle')
    setSelectedOptionId(null)
    hintAutoShownRef.current = false
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }

  const finishGame = () => {
    setRunning(false)
    setPaused(false)
    setShowHint(false)
    setShowHelp(false)
    setShowEnd(true)
    const finalScore = scoreRef.current
    const finalWrong = wrongRef.current
    try { if (onEnd) onEnd({ score: finalScore, timeMs: 0, mistakes: finalWrong }) } catch { /* ignore */ }

    // update local highscore
    try {
      const existingRaw = localStorage.getItem(localHighKey)
      const existing = existingRaw ? Number(existingRaw) : null
      const newHigh = existing === null || Number.isNaN(existing) ? finalScore : Math.max(existing, finalScore)
      localStorage.setItem(localHighKey, String(newHigh))
      setHighScore(newHigh)
      setIsNewHigh(existing === null || Number.isNaN(existing) ? true : finalScore > existing)
    } catch {
      setIsNewHigh(false)
    }
  }

  const onDragStart = (ev: React.DragEvent, id: string) => {
    if (!running || paused || showEnd) return
    try { ev.dataTransfer.setData('text/plain', id) } catch { /* ignore */ }
    try { ev.dataTransfer.effectAllowed = 'move' } catch { /* ignore */ }
  }

  const onDropZoneDrop = (ev: React.DragEvent) => {
    if (!running || paused || showEnd) return
    ev.preventDefault()
    let id = ''
    try { id = ev.dataTransfer.getData('text/plain') } catch { /* ignore */ }
    if (!id) return
    setSelectedOptionId(id)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
  }

  const onDropZoneDragOver = (ev: React.DragEvent) => {
    if (!running || paused || showEnd) return
    ev.preventDefault()
    try { ev.dataTransfer.dropEffect = 'move' } catch { /* ignore */ }
  }

  const selectedBlock = useMemo(() => visibleOptions.find((o) => o.id === selectedOptionId) ?? null, [visibleOptions, selectedOptionId])

  // Flexible icon renderer: supports plain URLs, data URLs, URL-encoded SVG
  // strings, raw SVG markup, SVGR components and module shapes.
  function renderIcon(icon: unknown, id: string): React.ReactNode {
    if (!icon) return null
    // string cases
    if (typeof icon === 'string') {
      const s = icon.trim()
      // direct data URL
      if (s.startsWith('data:image')) return <img id={`${id}-icon`} src={s} className="nzs-block__icon" aria-hidden alt="" />

      // URL-encoded SVG (contains %3Csvg or other percent-escapes) -> try decode
      try {
        if (/%3[cC]svg/.test(s) || s.indexOf('%3C') >= 0) {
          const dec = decodeURIComponent(s)
          if (dec.indexOf('<svg') >= 0) {
            const b64 = typeof window !== 'undefined' && typeof window.btoa === 'function'
              ? window.btoa(unescape(encodeURIComponent(dec)))
              : ''
            if (b64) return <img id={`${id}-icon`} src={`data:image/svg+xml;base64,${b64}`} className="nzs-block__icon" aria-hidden alt="" />
          }
        }
      } catch { /* ignore decode errors */ }

      // raw SVG markup -> base64
      if (s.indexOf('<svg') >= 0) {
        try {
          const b64 = typeof window !== 'undefined' && typeof window.btoa === 'function'
            ? window.btoa(unescape(encodeURIComponent(s)))
            : ''
          if (b64) return <img id={`${id}-icon`} src={`data:image/svg+xml;base64,${b64}`} className="nzs-block__icon" aria-hidden alt="" />
        } catch { /* ignore */ }
      }

      // file URLs ending with extension
      if (s.endsWith('.svg') || s.endsWith('.png')) return <img id={`${id}-icon`} src={s} className="nzs-block__icon" aria-hidden alt="" />

      return <span id={`${id}-icon`} className="nzs-block__icon" aria-hidden>{String(icon)}</span>
    }

    // functional React component (SVGR)
    if (typeof icon === 'function') {
      const Comp = icon as React.ComponentType<unknown>
      return (
        <span id={`${id}-icon`} className="nzs-block__icon" aria-hidden>
          <Comp />
        </span>
      )
    }

    // object shapes: { default: url } or { default: Component } or { ReactComponent }
    if (typeof icon === 'object') {
      const maybe = icon as { default?: unknown; ReactComponent?: unknown }
      if (typeof maybe.default === 'string' && (maybe.default as string).startsWith('data:image')) {
        return <img id={`${id}-icon`} src={maybe.default as string} className="nzs-block__icon" aria-hidden alt="" />
      }
      if (typeof maybe.default === 'string' && ((maybe.default as string).endsWith('.svg') || (maybe.default as string).endsWith('.png'))) {
        return <img id={`${id}-icon`} src={maybe.default as string} className="nzs-block__icon" aria-hidden alt="" />
      }
      if (typeof maybe.default === 'function') {
        const Comp = maybe.default as React.ComponentType<unknown>
        return (
          <span id={`${id}-icon`} className="nzs-block__icon" aria-hidden>
            <Comp />
          </span>
        )
      }
      if (typeof maybe.ReactComponent === 'function') {
        const Comp = maybe.ReactComponent as React.ComponentType<unknown>
        return (
          <span id={`${id}-icon`} className="nzs-block__icon" aria-hidden>
            <Comp />
          </span>
        )
      }
    }

    return <span id={`${id}-icon`} className="nzs-block__icon" aria-hidden>{String(icon)}</span>
  }

  // If the currently selected option is no longer visible (because we limited
  // visibleOptions to 5), clear the selection so the dropzone doesn't show
  // a non-existent block.
  useEffect(() => {
    try {
      if (selectedOptionId && !visibleOptions.some((o) => o.id === selectedOptionId)) {
        setSelectedOptionId(null)
      }
    } catch { /* ignore */ }
  }, [visibleOptions, selectedOptionId])

  const canCheck = running && !paused && !showEnd && Boolean(selectedOptionId) && answerState === 'idle'

  const goNextScenario = () => {
    const next = pickNextScenario(pool, currentScenario.id)
    lastScenarioIdRef.current = currentScenario.id
    // reset per-round wrong counter and lock hint for the new round
    wrongInRoundRef.current = 0
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    setCurrentScenario(next)
    setSelectedOptionId(null)
    setAnswerState('idle')
  }

  const handleCheck = () => {
    if (!canCheck) return
    // prevent re-entrance for extremely fast clicks
    if (checkingRef.current) return
    checkingRef.current = true

    const correct = selectedOptionId === currentScenario.correctOptionId
    if (correct) {
      setAnswerState('correct')
      setFeedback(randFrom(POSITIVE_FEEDBACK))
      setFeedbackType('good')
      if (isPractice) {
        const nextPractice = practiceCorrect + 1
        setPracticeCorrect(nextPractice)
        window.setTimeout(() => {
          try {
            if (nextPractice >= 3) {
              setRunning(false)
              setPaused(false)
              setShowPracticeEnd(true)
              setSelectedOptionId(null)
              setAnswerState('idle')
              setFeedback(null)
              setFeedbackType(null)
            } else {
              goNextScenario()
              setFeedback(null)
              setFeedbackType(null)
            }
          } finally {
            checkingRef.current = false
          }
        }, 700)
      } else {
        const nextScore = scoreRef.current + 2
        const nextCorrectCount = correctRef.current + 1
        scoreRef.current = nextScore
        correctRef.current = nextCorrectCount
        setScore(nextScore)
        setTotalCorrect(nextCorrectCount)
        window.setTimeout(() => {
          try {
            setFeedback(null)
            setFeedbackType(null)
            if (nextCorrectCount >= 20) {
              // end game at 20 correct
              finishGame()
            } else {
              goNextScenario()
            }
          } finally {
            checkingRef.current = false
          }
        }, 700)
      }
    } else {
      setAnswerState('wrong')
      setFeedback(randFrom(NEGATIVE_FEEDBACK))
      setFeedbackType('bad')
      if (!isPractice) {
        const nextScore = Math.max(0, scoreRef.current - 1)
        const nextWrong = wrongRef.current + 1
        scoreRef.current = nextScore
        wrongRef.current = nextWrong
        setScore(nextScore)
        setTotalWrong(nextWrong)
        // increment per-round wrong counter and unlock hint for this round
        try {
          wrongInRoundRef.current = (wrongInRoundRef.current || 0) + 1
          const threshold = MISTAKES_HINT_THRESHOLD[effectiveAge]
          if (wrongInRoundRef.current >= threshold) {
            try {
              const w = window as unknown as Record<string, unknown>
              // only unlock for real game (not practice); do not auto-open
              w['__pz_hint_unlocked'] = true
              window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      // stay on same scenario; player can try again
      // Release the checking lock immediately for wrong answers so
      // rapid consecutive attempts (as in tests or fast users) are
      // still registered and contribute to the per-round counter.
      checkingRef.current = false
      window.setTimeout(() => {
        try {
          setFeedback(null)
          setFeedbackType(null)
          setAnswerState('idle')
        } finally {
          // ensure checkingRef is cleared even if something odd happens
          checkingRef.current = false
        }
      }, 900)
    }
  }

  

  // keep scenario updated if pool changes (age group)
  useEffect(() => {
    setCurrentScenario(pickNextScenario(pool, lastScenarioIdRef.current))
    setSelectedOptionId(null)
  }, [pool])

  // Determine if the current scenario should render an AND-token / two
  // condition layout. This is explicit and defensive: treat the scenario as
  // two-condition when the scenario declares an `andKeyword`, has a
  // `blankPosition` (indicating a separate blank for the second condition),
  // or when both `fixedLeft` and `fixedRight` are present. This avoids
  // accidentally showing the AND-token when the scenario is really a
  // single-condition with the word "en" inside `fixedLeft` text.
  const isTwoCondition = Boolean(
    currentScenario && (
      currentScenario.andKeyword ||
      currentScenario.blankPosition ||
      (currentScenario.fixedLeft && currentScenario.fixedRight)
    )
  )

  // When rendering two-condition layouts we want the AND/EN token to be a
  // separate token. Developers sometimes accidentally include the word
  // "en" in the fixedLeft/fixedRight strings; sanitize only the boundary
  // occurrence (leading on right-side, trailing on left-side) so the
  // explicit token appears alone.
  const sanitizeBoundaryEn = (s?: string, side: 'left' | 'right' = 'left') => {
    if (!s) return s
    try {
      if (side === 'left') {
        // remove trailing ' en' (case-insensitive) if present
        return s.replace(/\s+en\s*$/i, '').trim()
      }
      // right side: remove leading 'en '
      return s.replace(/^\s*en\s+/i, '').trim()
    } catch {
      return s
    }
  }

  const sanitizedLeft = isTwoCondition ? sanitizeBoundaryEn(currentScenario.fixedLeft, 'left') : currentScenario.fixedLeft
  const sanitizedRight = isTwoCondition ? sanitizeBoundaryEn(currentScenario.fixedRight, 'right') : currentScenario.fixedRight

  // Show clickable office scene first (like PrinterSlaatOpHol). Return early
  // so the office intro appears before the regular start modal / tutorial.
  if (showOfficeIntro) {
    return (
      <div
        id="nzs-office-intro"
        className="pz-layout thermostaat-root"
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
      >
        <div id="nzs-office-bg" className="thermostaat-office-intro" style={{ backgroundImage: `url(${officeBackgroundPng})` }}>
          {/* computer image bottom-left */}
          <img id="nzs-office-computer" src={officeComputerSvg} alt="" aria-hidden className="thermostaat-office-intro__computer" />

          {/* printer image bottom-right */}
          <img id="nzs-office-printer" src={officePrinterPng} alt="" aria-hidden className="thermostaat-office-intro__printer" />

          {/* overlay thermostat error positioned over the thermostat on the background (top-left) */}
          <button
            id="nzs-office-device-btn"
            type="button"
            className="thermostaat-office-intro__device-btn"
            onClick={() => { setShowOfficeIntro(false); setShowCatastrophe(true) }}
            aria-label="Klik op de thermostaat"
          >
            <div className="thermostaat-office-intro__wrap">
              <div id="nzs-office-device-label" className="thermostaat-office-intro__label">Klik hier</div>
              <img id="nzs-office-device-img" src={ThermostaatError} alt="" aria-hidden className="thermostaat-office-intro__device-img" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Catastrophe popup: appears after the office intro and before the
  // main intro. Uses the thermostat background (no blur) so the modal looks
  // like it's popping up on the device.
  if (showCatastrophe) {
    return (
      <div
        id="nzs-office-catastrophe"
        className="pz-layout thermostaat-root"
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', zIndex: 900 }}
      >
        {/* Use the explicit thermostat background asset (no blur) so the popup
            appears directly on the device image. */}
        <div id="nzs-office-bg" className="thermostaat-office-intro" style={{ backgroundImage: `url(${bgThermostaat})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%', backgroundPosition: 'center top' }}>
        </div>

        <div className="pz-start-overlay pz-no-blur">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            {/* Close button top-right (small circular ×) */}
            <button
              type="button"
              aria-label="Sluit"
              onClick={() => { setShowCatastrophe(false); setShowIntro(true); }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                background: '#fff',
                color: '#000',
                /* Removed box-shadow per request */
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 50,
                lineHeight: 1,
                padding: 0
              }}
            >
              ×
            </button>
             {/* big warning icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <img src={WarningImg} alt="Waarschuwing" style={{ width: 140, height: 'auto' }} />
            </div>
             <h2 style={{ textAlign: 'center', marginTop: 12 }}>Alle programma's zijn gecrasht</h2>
            {/* 'Volgende' button removed per request - use the top-right close button */}
           </div>
         </div>
       </div>
     )
   }

  return (
    <div
      id="nzs-root"
      className={`pz-layout thermostaat-root ${effectiveAge === '8-10' ? 'nzs-age-8-10' : ''}`}
        style={{
        position: 'fixed',
        top: 'var(--nav-height)',
        left: 0,
        right: 0,
        bottom: 'var(--bottombar-height)',
        border: '10px solid #000',
        boxSizing: 'border-box',
        zIndex: 900,
          backgroundImage: `url(${bgThermostaat})`,
          backgroundRepeat: 'no-repeat',
          /* make the background slightly wider while preserving its height */
          backgroundSize: '100% 100%',
          backgroundPosition: 'center top'
      }}
    >
          {/* background image is applied via CSS background (contain) so it's behind the UI */}
      {!showEnd && (
        <>
          {/* Top-left score (stacked) */}
          <div className="pz-score-stack" style={{ position: 'absolute', top: 20, left: 30, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 950, alignItems: 'flex-start' }}>
            <div id="nzs-score" ref={scoreBadgeRef} className="pz-score">{isPractice ? 'Oefenronde' : `Score: ${score}`}</div>
            {/* Feedback box: only render when there's text to show so we don't leave an empty yellow box
                Do NOT show this small +2 / -1 feedback during the practice round. */}
            {
              (() => {
                // hide the small score feedback badge during the practice round
                if (isPractice) return null

                const fbText = answerState === 'correct' ? '+2' : answerState === 'wrong' ? '-1' : null
                if (!fbText) return null
                const cls = answerState === 'correct' ? 'pz-score nzs-feedback--good' : 'pz-score nzs-feedback--bad'
                return <div id="nzs-score-2" ref={feedbackBadgeRef} className={cls} aria-live="polite">{fbText}</div>
              })()
            }
          </div>

          {/* Bottom-left progress bar (out of 20 for real game, 3 for practice) */}
          <div id="nzs-progress" className="pz-progress" aria-label="Voortgang">
            <div
              id="nzs-progress-fill"
              className="pz-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, (isPractice ? (practiceCorrect / 3) : (totalCorrect / 20)) * 100))}%` }}
            />
            <div id="nzs-progress-text" className="pz-progress-text">{isPractice ? `${practiceCorrect}/3` : `${totalCorrect}/20`}</div>
          </div>
        </>
      )}

      {!showEnd && feedback && (
        <div
          id={feedbackType === 'good' ? 'nzs-feedback-good' : feedbackType === 'bad' ? 'nzs-feedback-bad' : 'nzs-feedback'}
          className={
            'pz-feedback ' +
            (feedbackType === 'good' ? 'pz-feedback--good' : 'pz-feedback--bad') +
            ' nzs-feedback ' +
            (feedbackType === 'good' ? 'nzs-feedback--good' : 'nzs-feedback--bad')
          }
        >
          {feedback}
        </div>
      )}

      {!showEnd && (
        <div id="nzs-stage" className="nzs-stage">
          <div id="nzs-board" className="nzs-board">
            <div className="nzs-sentence" aria-label="Zin">
              <div className="nzs-token nzs-token--kw">{currentScenario.leftKeyword}</div>

              {/* Single-condition scenario (no AND): show blank (dropzone) immediately after ALS, then the fixed text */}
              {!isTwoCondition && (
                <>
                  <div
                    id="nzs-dropzone"
                    className={`nzs-dropzone ${answerState === 'correct' ? 'nzs-dropzone--correct' : answerState === 'wrong' ? 'nzs-dropzone--wrong' : ''}`}
                    onDrop={onDropZoneDrop}
                    onDragOver={onDropZoneDragOver}
                    aria-label="Lege plek"
                  >
                    {selectedBlock ? (
                      <div id={`nzs-selected-${selectedBlock.id}`} className={`nzs-block nzs-block--selected ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}>
                        {renderIcon(selectedBlock.icon, `nzs-selected-${selectedBlock.id}`)}
                        <span id={`nzs-selected-${selectedBlock.id}-label`} className="nzs-block__label">{selectedBlock.label}</span>
                      </div>
                    ) : (
                      <div id="nzs-dropzone-placeholder" className="nzs-dropzone__placeholder" />
                    )}
                  </div>
                </>
              )}

              {/* Two-condition scenario with AND: support blank before or after AND */}
              {isTwoCondition && (
                <>
                  {currentScenario.blankPosition === 'before' ? (
                    <>
                      {/* dropzone before AND */}
                      <div
                        id="nzs-dropzone"
                        className={`nzs-dropzone ${answerState === 'correct' ? 'nzs-dropzone--correct' : answerState === 'wrong' ? 'nzs-dropzone--wrong' : ''}`}
                        onDrop={onDropZoneDrop}
                        onDragOver={onDropZoneDragOver}
                        aria-label="Lege plek"
                      >
                        {selectedBlock ? (
                          <div id={`nzs-selected-${selectedBlock.id}`} className={`nzs-block nzs-block--selected ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}>
                            {renderIcon(selectedBlock.icon, `nzs-selected-${selectedBlock.id}`)}
                            <span id={`nzs-selected-${selectedBlock.id}-label`} className="nzs-block__label">{selectedBlock.label}</span>
                          </div>
                        ) : (
                          <div id="nzs-dropzone-placeholder" className="nzs-dropzone__placeholder" />
                        )}
                      </div>

                      <div className="nzs-token nzs-token--kw">{currentScenario.andKeyword ?? 'EN'}</div>
                      <div className="nzs-fixed">{sanitizedRight}</div>
                    </>
                  ) : (
                    <>
                      {/* blank after AND: show fixedLeft, AND, then dropzone */}
                      <div className="nzs-fixed">{sanitizedLeft}</div>
                      <div className="nzs-token nzs-token--kw">{currentScenario.andKeyword ?? 'EN'}</div>

                      <div
                        id="nzs-dropzone"
                        className={`nzs-dropzone ${answerState === 'correct' ? 'nzs-dropzone--correct' : answerState === 'wrong' ? 'nzs-dropzone--wrong' : ''}`}
                        onDrop={onDropZoneDrop}
                        onDragOver={onDropZoneDragOver}
                        aria-label="Lege plek"
                      >
                        {selectedBlock ? (
                          <div id={`nzs-selected-${selectedBlock.id}`} className={`nzs-block nzs-block--selected ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}>
                            {renderIcon(selectedBlock.icon, `nzs-selected-${selectedBlock.id}`)}
                            <span id={`nzs-selected-${selectedBlock.id}-label`} className="nzs-block__label">{selectedBlock.label}</span>
                          </div>
                        ) : (
                          <div id="nzs-dropzone-placeholder" className="nzs-dropzone__placeholder" />
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="nzs-token nzs-token--kw">{currentScenario.thenKeyword}</div>
              <div className={`nzs-action ${effectiveAge === '14-16' ? 'nzs-action--code' : ''}`}>{currentScenario.fixedAction}</div>
              {currentScenario.elseKeyword && (
                <>
                  <div className="nzs-token nzs-token--kw">{currentScenario.elseKeyword}</div>
                  <div className={`nzs-action ${effectiveAge === '14-16' ? 'nzs-action--code' : ''}`}>{currentScenario.fixedElse}</div>
                </>
              )}
            </div>

            <div id="nzs-options" className="nzs-options" aria-label="Blokken">
              {visibleOptions.map((opt) => {
                const isCorrect = opt.id === currentScenario.correctOptionId
                const suffix = isCorrect ? 'correct' : 'wrong'
                return (
                  <div
                    id={`nzs-option-${opt.id}-${suffix}`}
                    key={opt.id}
                    data-correct={isCorrect ? 'true' : 'false'}
                    className={`nzs-block ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}
                    draggable={running && !paused && !showEnd}
                    onDragStart={(ev) => onDragStart(ev, opt.id)}
                    role="button"
                    aria-label={opt.label}
                  >
                    {renderIcon(opt.icon, `nzs-option-${opt.id}-${suffix}`)}
                    <span id={`nzs-option-${opt.id}-${suffix}-label`} className="nzs-block__label">{opt.label}</span>
                  </div>
                )
              })}
            </div>

            <button id="nzs-check-button" style={{ marginTop: 30}} className="pz-start-btn pz-start-btn--large" onClick={handleCheck} disabled={!canCheck}>
              Nakijken
            </button>
          </div>
        </div>
      )}

      

      {showIntro && (
        <div id="nzs-start-overlay" className="pz-start-overlay">
          <div id="nzs-start-modal" className="pz-start-modal">
            <h2>Speluitleg - (Niet zo) slimme thermostaat</h2>
            <ul id="nzs-start-bullets" className="pz-start-bullets">
              {introText.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ textAlign: 'center' }}>
              <button id="nzs-start-next" className="pz-start-btn pz-start-btn--large" onClick={openPracticeStart}>Volgende</button>
            </div>
          </div>
        </div>
      )}

      {showPracticeStart && (
        <div id="nzs-practice-start-overlay" className="pz-start-overlay">
          <div id="nzs-practice-start-modal" className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Even oefenen!</h2>
            <p style={{ marginTop: 12, textAlign: 'left' }}>In de oefenronde tellen je punten nog niet mee.</p>
            {effectiveAge === '8-10' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste zin (ALS ... EN ... DAN ...).</p>
            )}
            {effectiveAge === '11-13' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste zin (ALS ... EN ... DAN ...).</p>
            )}
            {effectiveAge === '14-16' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste regel (IF ... AND ... THEN ... ELSE ...).</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button id="nzs-practice-play" className="pz-start-btn pz-start-btn--large" onClick={startPractice}>Spelen</button>
              <button id="nzs-practice-skip" className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={startRealGame}>Oefenronde overslaan</button>
            </div>
          </div>
        </div>
      )}

      {showPracticeEnd && (
        <div id="nzs-practice-end-overlay" className="pz-start-overlay">
          <div id="nzs-practice-end-modal" className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Het echte spel begint nu</h2>
            <p style={{ marginTop: 12, textAlign: 'left' }}>Punten tellen mee. Succes!</p>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button id="nzs-practice-end-play" className="pz-start-btn pz-start-btn--large" onClick={startRealGame}>Spelen</button>
              <button id="nzs-practice-end-repeat" className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { setShowPracticeEnd(false); setShowPracticeStart(true) }}>Opnieuw oefenen</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div id="nzs-help-overlay" className="pz-pause-overlay" onClick={() => { setShowHelp(false); setPaused(false) }}>
          <div id="nzs-help-modal" className="pz-pause-modal pz-help-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Speluitleg - (Niet zo) slimme thermostaat</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul id="nzs-help-bullets" className="pz-start-bullets pz-hint-bullets">
                {introText.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button id="nzs-help-close" className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHelp(false); setPaused(false) }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div id="nzs-hint-overlay" className="pz-pause-overlay" onClick={() => { setShowHint(false); setPaused(false) }}>
          <div id="nzs-hint-modal" className="pz-pause-modal pz-hint-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="nzs-hint-title">Hint</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul id="nzs-hint-bullets" className="pz-start-bullets pz-hint-bullets">
                {computedHint.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button id="nzs-hint-close" className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false) }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paused && !showPracticeEnd && !showPracticeStart && !showIntro && !showHint && !showHelp && (
        <div id="nzs-pause-overlay" className="pz-pause-overlay">
          <div id="nzs-pause-modal" className="pz-pause-modal">
            <h2 id="nzs-pause-title">Pauze</h2>
            <div className="pz-pause-actions">
              <button id="nzs-pause-continue" className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)}>Verder spelen</button>
              <button id="nzs-pause-restart" className="pz-pause-action pz-pause-action--primary" onClick={restartGame}>Opnieuw beginnen</button>
              <button id="nzs-pause-stop" className="pz-pause-action pz-pause-action--danger" onClick={() => {
                try { setPaused(false) } catch { /* ignore */ }
                try { setRunning(false) } catch { /* ignore */ }
                try { setStoppedByUser(true) } catch { /* ignore */ }
                try { setShowEnd(true) } catch { /* ignore */ }
                try { if (onEnd) onEnd({ score: 0, timeMs: 0, mistakes: totalWrong }) } catch { /* ignore */ }
              }}>Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div id="nzs-end" className="pz-end">
          <div id="nzs-end-box" className="pz-end-box">
            {/* fireworks canvas (renders behind the end content) */}
            <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
            <div id="nzs-highscore" className="pz-highscore" style={{ marginBottom: 18, textAlign: 'center' }}>
              <span className="pz-highscore-label">Hoogste score:</span>
              <span id="nzs-highscore-value" className="pz-highscore-value">{highScore ?? '-'}</span>
              {isNewHigh && <span id="nzs-new-record" className="pz-new-record"> Nieuw record!</span>}
            </div>

            <div className="pz-end-content">
              <div className="pz-end-left">
                <div id="nzs-score-circle" className="pz-score-circle" aria-hidden style={circleStyle}>
                  <div className="pz-score-label">SCORE</div>
                  <div id="nzs-score-number" className="pz-score-number">{stoppedByUser ? 0 : score}</div>
                  <div id="nzs-score-percent" className="pz-score-percent">{stoppedByUser ? 0 : percent}%</div>
                  <div className="pz-score-stars" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} id={`nzs-star-${i}`} className={'pz-star ' + (i < (stoppedByUser ? 0 : starCount) ? 'pz-star--filled' : 'pz-star--empty')} aria-hidden>
                        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.211l8.2-1.193z" />
                        </svg>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pz-stats-row">
                  <div id="nzs-stats-correct" className="pz-stats-correct">
                    <div className="shine" aria-hidden></div>
                    <div className="label">Juist</div>
                    <div id="nzs-stats-correct-value" className="score"><span className="plus">+</span>{stoppedByUser ? 0 : totalCorrect}</div>
                  </div>
                  <div id="nzs-stats-wrong" className="pz-stats-wrong">
                    <div className="shine" aria-hidden></div>
                    <div className="label">Fout</div>
                    <div id="nzs-stats-wrong-value" className="score"><span className="minus">-</span>{stoppedByUser ? 0 : totalWrong}</div>
                  </div>
                </div>
              </div>

              <div className="pz-end-right">
                <div id="nzs-tips-card" className="pz-tips-card">
                  <h3 id="nzs-end-title">{stoppedByUser ? 'Spel gestopt, geen score' : 'Performantie tip'}</h3>
                  <ul>
                    <li id="nzs-end-tip">{stoppedByUser ? 'Je spel is gestopt en er is geen score opgeslagen.' : END_TIP_BY_AGE[effectiveAge]}</li>
                  </ul>
                  <div className="pz-end-actions">
                    <button id="nzs-play-again" className="pz-play-again" onClick={restartGame}>Opnieuw spelen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


