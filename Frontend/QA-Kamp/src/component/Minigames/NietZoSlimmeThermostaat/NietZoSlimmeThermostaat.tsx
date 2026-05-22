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
import TVIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/TVIcon.svg'
import TekenenIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/TekenenIcon.svg'
import ZingIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/ZingIcon.svg'
import WaterIcon from '../../../assets/NietZoSlimmeThermostaatImages/OptieFotos/WaterIcon.svg'
// audio assets for the game
import bgMusic from '../../../assets/NietZoSlimmeThermostaatImages/NZSThermostaatMusic.mp3'
import correctSound from '../../../assets/NietZoSlimmeThermostaatImages/correctNZSThermostaat.mp3'
import wrongSound from '../../../assets/NietZoSlimmeThermostaatImages/wrongNZSThermostaat.mp3'
import fireworksSound from '../../../assets/sounds/Fireworks.mp3'


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
  fixedAction?: string
  fixedElse?: string
  // If true the missing piece for this scenario is the action (the THEN
  // branch) rather than a condition. When set, the UI should render a
  // dropzone after the THEN token and `options` contains action blocks.
  blankAction?: boolean
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
      // "het licht is" represents ambient daylight for younger kids so use the day icon
      { id: 'light', label: 'het licht is', icon: DagIcon },
      { id: 'tv', label: 'de tv is aan', icon: TVIcon },
      { id: 'person', label: 'er is iemand', icon: PersoonIcon },
      { id: 'window', label: 'het raam is open', icon: VensterIcon },
      { id: 'battery', label: 'de batterij is bijna leeg', icon: BatterijIcon }
    ]

    // Helper removed: thermostat scenarios are defined explicitly below.

    // Explicit thermostat scenarios for 8-10 matching the provided table.
    const thermostatScenarios: Scenario[] = [
      // 1 ALS ___ DAN zet de lamp aan (correct: het nacht is)
      // For this scenario we want only the five primary thermostat options
      // (het regent, het nacht is, het koud is, het warm is, het dag is).
      { id: 't1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'night' },
      // 2 ALS ___ DAN zet de lamp uit (correct: het dag is)
      // Limit options to the five primary thermostat options for clarity.
      { id: 't2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'day' },
      // 3 ALS ___ DAN zet de verwarming aan (correct: het koud is)
      // Limit options to the five primary thermostat options for clarity.
      { id: 't3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 4 ALS ___ DAN zet de verwarming uit (correct: het warm is)
      // Limit options to the five primary thermostat options for clarity.
      { id: 't4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'warm' },

      // 5 ALS ___ EN het regent DAN zet de lamp aan (blank before EN -> fixedRight)
      // Limit options to the five primary thermostat options for clarity.
      { id: 't5', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'night' },
      // 6 ALS het nacht is EN ___ DAN is het nat buiten (blank after EN)
      // We change the action to "is het nat buiten" and limit the options to the five primary ones.
      { id: 't6', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'is het nat buiten', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'rain' },
      // 7 ALS ___ EN het dag is DAN zet de lamp uit (blank before EN)
      { id: 't7', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'speel in het zwembad', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'warm' },
      // 8 ALS het dag is EN ___ DAN is het nat buiten (blank after EN)
      { id: 't8', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'is het nat buiten', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'rain' },
      // 9 ALS ___ EN het regent DAN zet de verwarming aan (blank before EN)
      { id: 't9', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 10 ALS het koud is EN ___ DAN zet de lamp aan (blank after EN)
      // use the five primary thermostat options and correct = 'night'
      { id: 't10', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'night' },
      // 11 ALS ___ EN het dag is DAN zet de verwarming uit (blank before EN)
      { id: 't11', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'warm' },
      // 12 ALS het warm is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't12', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'day' },
      // 13 ALS ___ EN het koud is DAN zet de lamp uit (blank before EN)
      { id: 't13', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'day' },
      // 14 ALS het nacht is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't14', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 15 ALS ___ EN het warm is DAN doe de paraplu open (blank before EN)
      { id: 't15', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het warm is', thenKeyword: 'DAN', fixedAction: 'doe de paraplu open', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'rain' },
      // 16 ALS het regent EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't16', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 17 ALS het nacht is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't17', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'warm' },
      // 18 ALS het dag is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't18', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'cold' },
      // 19 ALS het warm is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't19', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'night' },
      // 20 ALS het koud is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't20', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [thermoOptions[0], thermoOptions[1], thermoOptions[2], thermoOptions[3], thermoOptions[4]], correctOptionId: 'day' },
      // (t21 and t22 removed per request)
    ]

    // Other smart-home scenarios for 8-10; use a broader options list
    const deviceOptions: Block[] = [
      { id: 'cold', label: 'het koud is', icon: KoudIcon },
      { id: 'warm', label: 'het warm is', icon: WarmIcon },
      // ambient light (day/night) shown with the day icon for 8-10
      { id: 'light', label: 'het licht is', icon: DagIcon },
      { id: 'tv_on', label: 'de tv aan staat', icon: TVIcon },
      { id: 'doorbell', label: 'iemand aanbelt', icon: DeurIcon },
      { id: 'sunrise', label: 'de zon opkomt', icon: DagIcon },
      { id: 'dark', label: 'het donker wordt', icon: NachtIcon },
      { id: 'morning', label: 'het ochtend is', icon: DagIcon },
      { id: 'radio', label: 'de radio speelt', icon: RadioIcon },
      // when a device (like the radio) is not used we still show the radio icon
      { id: 'device_not_used', label: 'het apparaat niet gebruikt wordt', icon: RadioIcon },
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
      { id: 'zingt', label: 'je zingt', icon: ZingIcon },
        { id: 'thuis', label: 'je thuis bent', icon: HuisIcon }
    ]

    // Device scenarios are defined explicitly below.

    const deviceScenarios: Scenario[] = [
      // 1
      { id: 'd1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming aan', options: [deviceOptions[0], deviceOptions[1], deviceOptions[2], deviceOptions[3]], correctOptionId: 'cold' },
      // 2
      { id: 'd2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [deviceOptions[1], deviceOptions[0], deviceOptions[6], deviceOptions[4]], correctOptionId: 'warm' },
      // 3
      { id: 'd3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de lamp aan', options: [deviceOptions[9], deviceOptions[2], deviceOptions[1], thermoOptions[0]], correctOptionId: 'dark' },
      // 4
      { id: 'd4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de lamp uit', options: [deviceOptions[2], deviceOptions[6], deviceOptions[0], thermoOptions[0]], correctOptionId: 'light' },
      // 5
      { id: 'd5', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de thermostaat lager', options: [deviceOptions[13], deviceOptions[0], deviceOptions[4], deviceOptions[8]], correctOptionId: 'bedtime' },
      // 6
      { id: 'd6', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de thermostaat hoger', options: [deviceOptions[0], deviceOptions[27], deviceOptions[2], deviceOptions[4]], correctOptionId: 'cold' },
      // 7
      { id: 'd7', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme deurbel af', options: [deviceOptions[4], thermoOptions[0], deviceOptions[1], deviceOptions[2]], correctOptionId: 'doorbell' },
      // 8
      { id: 'd8', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen open', options: [deviceOptions[5], deviceOptions[6], deviceOptions[0], deviceOptions[8]], correctOptionId: 'sunrise' },
      // 9
      { id: 'd9', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen dicht', options: [deviceOptions[6], deviceOptions[7], deviceOptions[14], deviceOptions[31]], correctOptionId: 'dark' },
      // 10
      { id: 'd10', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme wekker af', options: [deviceOptions[7], deviceOptions[8], deviceOptions[1], thermoOptions[0]], correctOptionId: 'morning' },
      // 11
      { id: 'd11', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme stekker uit', options: [deviceOptions[9], deviceOptions[0], deviceOptions[6], deviceOptions[5]], correctOptionId: 'device_not_used' },
      // 12
      { id: 'd12', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de ventilator aan', options: [deviceOptions[1], deviceOptions[0], deviceOptions[2], deviceOptions[4]], correctOptionId: 'warm' },
      // 13
      { id: 'd13', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de ventilator uit', options: [deviceOptions[0], deviceOptions[27], deviceOptions[6], deviceOptions[17]], correctOptionId: 'cold' },
      // 14
      { id: 'd14', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme speaker praten', options: [deviceOptions[24], deviceOptions[0], deviceOptions[16], deviceOptions[2]], correctOptionId: 'you_enter' },
      // 15
      { id: 'd15', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de robotstofzuiger aan', options: [deviceOptions[20], deviceOptions[26], thermoOptions[0], deviceOptions[0]], correctOptionId: 'nobody_home' },
      // 16
      { id: 'd16', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'stopt de robotstofzuiger', options: [deviceOptions[21], deviceOptions[1], deviceOptions[2], deviceOptions[31]], correctOptionId: 'battery_low' },
      // 17
      { id: 'd17', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme camera opnemen', options: [deviceOptions[22], deviceOptions[1], deviceOptions[2], deviceOptions[6]], correctOptionId: 'movement' },
      // 18
      { id: 'd18', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat het buitenlicht aan', options: [deviceOptions[19], deviceOptions[1], deviceOptions[0], deviceOptions[8]], correctOptionId: 'someone_walks' },
      // 19
      { id: 'd19', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming lager', options: [deviceOptions[10], deviceOptions[2], deviceOptions[4], deviceOptions[3]], correctOptionId: 'window_open' },
      // 20
      { id: 'd20', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de wasmachine uit', options: [deviceOptions[11], deviceOptions[6], deviceOptions[1], deviceOptions[24]], correctOptionId: 'washing_done' },
      // 21
      { id: 'd21', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de vaatwasser uit', options: [deviceOptions[12], deviceOptions[0], deviceOptions[5], deviceOptions[4]], correctOptionId: 'program_done' },
      // 22
      { id: 'd22', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme lamp zacht branden', options: [deviceOptions[13], deviceOptions[25], deviceOptions[1], deviceOptions[4]], correctOptionId: 'bedtime' },
      // 23
      { id: 'd23', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming aan in de badkamer', options: [deviceOptions[14], deviceOptions[26], deviceOptions[2], deviceOptions[3]], correctOptionId: 'shower' },
      // 24
      { id: 'd24', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme kraan uit', options: [deviceOptions[15], deviceOptions[0], deviceOptions[6], deviceOptions[8]], correctOptionId: 'water_excess' },
      // 25
      { id: 'd25', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de rookmelder af', options: [deviceOptions[16], thermoOptions[0], deviceOptions[13], deviceOptions[2]], correctOptionId: 'smoke' },
      // 26
      { id: 'd26', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme koelkast piepen', options: [deviceOptions[17], deviceOptions[6], deviceOptions[0], deviceOptions[3]], correctOptionId: 'fridge_open' },
      // 27
      { id: 'd27', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de thermostaat op eco-stand', options: [deviceOptions[18], deviceOptions[21], deviceOptions[27], deviceOptions[6]], correctOptionId: 'everyone_away' },
      // 28 (two-condition: blank before EN)
      { id: 'd28', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is donker', thenKeyword: 'DAN', fixedAction: 'gaat de ganglamp aan', options: [deviceOptions[24], deviceOptions[13], deviceOptions[29], deviceOptions[31]], correctOptionId: 'you_enter' },
      // 29 (two-condition: blank before EN)
      { id: 'd29', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is koud', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming aan', options: [deviceOptions[33], deviceOptions[30], deviceOptions[10], deviceOptions[5] ], correctOptionId: 'thuis' },
      // 30 (two-condition: blank before EN)
      { id: 'd30', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is warm', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [ deviceOptions[33], deviceOptions[20], deviceOptions[10], deviceOptions[15] ], correctOptionId: 'thuis' }
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
      // 1 ALS ___ DAN zet de lamp aan (correct: het nacht is)
      { id: 't1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 2 ALS ___ DAN zet de lamp uit (correct: het dag is)
      { id: 't2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'day' },
      // 3 ALS ___ DAN zet de verwarming aan (correct: het koud is)
      { id: 't3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 4 ALS ___ DAN zet de verwarming uit (correct: het warm is)
      { id: 't4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'warm' },

      // 5 ALS ___ EN het regent DAN zet de lamp aan (blank before EN)
      { id: 't5', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 6 ALS het nacht is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't6', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.rain, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'rain' },
      // 7 ALS ___ EN het regent DAN zet de verwarming aan (blank before EN)
      { id: 't7', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 8 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't8', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.warm, baseOptions.day], correctOptionId: 'night' },
      // 9 ALS ___ EN het dag is DAN zet de verwarming uit (blank before EN)
      { id: 't9', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'warm' },
      // 10 ALS het warm is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't10', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.rain, baseOptions.night, baseOptions.cold, baseOptions.day], correctOptionId: 'day' },
      // 11 ALS het nacht is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't11', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.cold, baseOptions.warm, baseOptions.day], correctOptionId: 'cold' },
      // 12 ALS het koud is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't12', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.night, baseOptions.warm, baseOptions.day], correctOptionId: 'rain' },
      // 13 ALS het regent EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't13', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.day, baseOptions.night, baseOptions.cold, baseOptions.warm], correctOptionId: 'day' },
      // 14 ALS het regent EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't14', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het regent', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.warm, baseOptions.cold, baseOptions.night, baseOptions.day], correctOptionId: 'warm' },
      // 15 ALS het nacht is EN ___ DAN zet de verwarming uit (blank after EN)
      { id: 't15', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het nacht is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming uit', options: [baseOptions.cold, baseOptions.warm, baseOptions.day, baseOptions.rain], correctOptionId: 'warm' },
      // 16 ALS het dag is EN ___ DAN zet de verwarming aan (blank after EN)
      { id: 't16', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het dag is', thenKeyword: 'DAN', fixedAction: 'zet de verwarming aan', options: [baseOptions.rain, baseOptions.warm, baseOptions.cold, baseOptions.night], correctOptionId: 'cold' },
      // 17 ALS het warm is EN ___ DAN zet de lamp aan (blank after EN)
      { id: 't17', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het warm is', thenKeyword: 'DAN', fixedAction: 'zet de lamp aan', options: [baseOptions.cold, baseOptions.day, baseOptions.night, baseOptions.rain], correctOptionId: 'night' },
      // 18 ALS het koud is EN ___ DAN zet de lamp uit (blank after EN)
      { id: 't18', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'after', fixedLeft: 'het koud is', thenKeyword: 'DAN', fixedAction: 'zet de lamp uit', options: [baseOptions.night, baseOptions.day, baseOptions.warm, baseOptions.rain], correctOptionId: 'day' }
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
      battery_low: { id: 'battery_low', label: 'de batterij bijna leeg is' },
      thuis: { id: 'thuis', label: 'je thuis bent' }
    }

    const deviceScenarios: Scenario[] = [
      // 1 ALS ___ DAN gaat de airco aan
      { id: 'd1', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [devBase.hot, baseOptions.cold, devBase.dark, devBase.doorbell], correctOptionId: 'hot' },
      // 2 ALS ___ DAN gaat de slimme deurbel af
      { id: 'd2', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme deurbel af', options: [devBase.doorbell, baseOptions.rain, devBase.hot, { id: 'light', label: 'het licht is' } as Block], correctOptionId: 'doorbell' },
      // 3 ALS ___ DAN gaan de gordijnen open
      { id: 'd3', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen open', options: [devBase.sunrise, { id: 'night_falls', label: 'het nacht wordt' } as Block, baseOptions.cold, { id: 'radio', label: 'de radio speelt' } as Block], correctOptionId: 'sunrise' },
      // 4 ALS ___ DAN gaan de gordijnen dicht
      { id: 'd4', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaan de gordijnen dicht', options: [devBase.dark, { id: 'morning', label: 'het ochtend is' } as Block, baseOptions.warm, { id: 'zingt', label: 'iemand zingt' } as Block], correctOptionId: 'dark' },
      // 5 ALS ___ DAN gaat de slimme stekker uit
      { id: 'd5', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme stekker uit', options: [devBase.device_not_used, baseOptions.cold, devBase.dark, baseOptions.day], correctOptionId: 'device_not_used' },
      // 6 ALS ___ DAN gaat de ventilator aan
      { id: 'd6', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de ventilator aan', options: [devBase.hot, baseOptions.cold, { id: 'light', label: 'het licht is' } as Block, devBase.doorbell], correctOptionId: 'hot' },
      // 7 ALS ___ DAN gaat de slimme speaker praten
      { id: 'd7', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme speaker praten', options: [{ id: 'ask', label: 'je een vraag stelt' } as Block, baseOptions.cold, baseOptions.rain, { id: 'light', label: 'het licht is' } as Block], correctOptionId: 'ask' },
      // 8 ALS ___ DAN gaat de robotstofzuiger aan
      { id: 'd8', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de robotstofzuiger aan', options: [devBase.nobody_home, { id: 'everyone_sleep', label: 'iedereen slaapt' } as Block, baseOptions.rain, baseOptions.cold], correctOptionId: 'nobody_home' },
      // 9 ALS ___ DAN stopt de robotstofzuiger
      { id: 'd9', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'stopt de robotstofzuiger', options: [devBase.battery_low, devBase.hot, { id: 'light', label: 'het licht is' } as Block, { id: 'zingt', label: 'iemand zingt' } as Block], correctOptionId: 'battery_low' },
      // 10 ALS ___ DAN gaat de slimme camera opnemen
      { id: 'd10', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme camera opnemen', options: [devBase.movement, devBase.hot, { id: 'light', label: 'het licht is' } as Block, { id: 'heating_on', label: 'de verwarming aan staat' } as Block], correctOptionId: 'movement' },
      // 11 ALS ___ DAN gaat het buitenlicht aan
      { id: 'd11', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat het buitenlicht aan', options: [{ id: 'someone_walks', label: 'iemand langsloopt' } as Block, devBase.hot, baseOptions.cold, { id: 'radio', label: 'de radio speelt' } as Block], correctOptionId: 'someone_walks' },
      // 12 ALS ___ DAN gaat de verwarming lager
      { id: 'd12', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming lager', options: [devBase.window_open, { id: 'lamp_on', label: 'de lamp aan is' } as Block, devBase.doorbell, { id: 'tv', label: 'de tv speelt' } as Block], correctOptionId: 'window_open' },
      // 13 ALS ___ DAN gaat de wasmachine-melding aan
      { id: 'd13', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de wasmachine-melding aan', options: [devBase.washing_done, devBase.dark, devBase.hot, devBase.you_enter], correctOptionId: 'washing_done' },
      // 14 ALS ___ DAN gaat de vaatwasser uit
      { id: 'd14', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de vaatwasser uit', options: [devBase.program_done, baseOptions.cold, baseOptions.day, devBase.doorbell], correctOptionId: 'program_done' },
      // 15 ALS ___ DAN gaat de slimme lamp zacht branden
      { id: 'd15', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme lamp zacht branden', options: [devBase.bedtime, { id: 'middag', label: 'het middag is' } as Block, devBase.hot, devBase.doorbell], correctOptionId: 'bedtime' },
      // 16 ALS ___ DAN gaat de rookmelder af
      { id: 'd16', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de rookmelder af', options: [devBase.smoke, baseOptions.rain, baseOptions.warm, { id: 'light', label: 'het licht is' } as Block], correctOptionId: 'smoke' },
      // 17 ALS ___ DAN gaat de slimme koelkast piepen
      { id: 'd17', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de slimme koelkast piepen', options: [devBase.fridge_open, devBase.dark, { id: 'cold_outside', label: 'het koud buiten is' } as Block, devBase.doorbell], correctOptionId: 'fridge_open' },
      // 18 ALS ___ DAN gaat de thermostaat op eco-stand
      { id: 'd18', leftKeyword: 'ALS', thenKeyword: 'DAN', fixedAction: 'gaat de thermostaat op eco-stand', options: [devBase.everyone_away, { id: 'everyone_home', label: 'iedereen thuis is' } as Block, { id: 'very_cold', label: 'het heel koud is' } as Block, devBase.dark], correctOptionId: 'everyone_away' },
      // 19 ALS ___ EN het is donker DAN gaat de ganglamp aan (blank before EN)
      { id: 'd19', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is donker', thenKeyword: 'DAN', fixedAction: 'gaat de ganglamp aan', options: [devBase.you_enter, { id: 'slaapt', label: 'je slaapt' } as Block, { id: 'eet', label: 'je eet' } as Block, { id: 'tekent', label: 'je tekent' } as Block], correctOptionId: 'you_enter' },
      // 20 ALS ___ EN het is koud DAN gaat de verwarming aan (blank before EN)
      { id: 'd20', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is koud', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming aan', options: [{ id: 'thuis', label: 'je thuis bent' } as Block, { id: 'buiten', label: 'je buiten speelt' } as Block, devBase.window_open, devBase.sunrise], correctOptionId: 'thuis' },
      // 21 ALS ___ EN het is warm DAN gaat de airco aan (blank before EN)
      { id: 'd21', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het is warm', thenKeyword: 'DAN', fixedAction: 'gaat de airco aan', options: [{ id: 'thuis', label: 'je thuis bent' } as Block, devBase.nobody_home, devBase.window_open, { id: 'sneeuwt', label: 'het sneeuwt' } as Block], correctOptionId: 'thuis' },
      // 22 ALS ___ EN het donker wordt DAN gaat het buitenlicht aan (blank before EN)
      { id: 'd22', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het donker wordt', thenKeyword: 'DAN', fixedAction: 'gaat het buitenlicht aan', options: [devBase.movement, devBase.program_done, { id: 'sneeuwt2', label: 'het sneeuwt' } as Block, devBase.bedtime], correctOptionId: 'movement' },
      // 23 ALS ___ EN de batterij bijna leeg is DAN stopt de robotstofzuiger (blank before EN)
      { id: 'd23', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'de batterij bijna leeg is', thenKeyword: 'DAN', fixedAction: 'stopt de robotstofzuiger', options: [{ id: 'schoonmaakt', label: 'hij aan het schoonmaken is' } as Block, devBase.rain, devBase.bedtime, devBase.fridge_open], correctOptionId: 'schoonmaakt' },
      // 24 ALS ___ EN niemand thuis is DAN schakelt de slimme verlichting uit (blank before EN)
      { id: 'd24', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'niemand thuis is', thenKeyword: 'DAN', fixedAction: 'schakelt de slimme verlichting uit', options: [{ id: 'licht_brandt', label: 'het licht nog brandt' } as Block, baseOptions.cold, baseOptions.day, { id: 'kookt', label: 'iemand kookt' } as Block], correctOptionId: 'licht_brandt' },
      // 25 ALS ___ EN het raam openstaat DAN gaat de verwarming lager (blank before EN)
      { id: 'd25', leftKeyword: 'ALS', andKeyword: 'EN', blankPosition: 'before', fixedRight: 'het raam openstaat', thenKeyword: 'DAN', fixedAction: 'gaat de verwarming lager', options: [{ id: 'koud_buiten', label: 'het koud is buiten' } as Block, { id: 'tv', label: 'de tv speelt' } as Block, devBase.dark, { id: 'lamp_on', label: 'de lamp brandt' } as Block], correctOptionId: 'koud_buiten' }
    ]

    return [...thermostat, ...deviceScenarios]
  }

  // 14-16: code-like conditions with THEN/ELSE
  

  // Build explicit scenarios for 14-16 matching the provided thermostat table.
  // Some scenarios require the player to pick a condition, others require
  // choosing an action (blankAction=true). For action-selection scenarios
  // we supply action blocks as options.
  const actionBlocks = (
    list: Array<{ id: string; label: string }>
  ): Block[] => list.map((b) => ({ id: b.id, label: b.label }))

  return [
    // 1 IF ___ THEN turnLampOn() ELSE turnLampOff()  (condition)
    { id: 'c1', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnLampOn()', fixedElse: 'turnLampOff()', options: [
      { id: 'IsRaining', label: 'IsRaining' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsDay', label: 'IsDay' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsHot', label: 'IsHot' }
    ], correctOptionId: 'IsNight' },

    // 2 IF ___ THEN turnHeatingOn() ELSE turnHeatingOff() (condition)
    { id: 'c2', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnHeatingOn()', fixedElse: 'turnHeatingOff()', options: [
      { id: 'IsHot', label: 'IsHot' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsRaining', label: 'IsRaining' }, { id: 'IsDay', label: 'IsDay' }
    ], correctOptionId: 'IsCold' },

    // 3 IF ___ THEN turnAircoOn() ELSE turnAircoOff() (condition)
    { id: 'c3', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnAircoOn()', fixedElse: 'turnAircoOff()', options: [
      { id: 'IsCold', label: 'IsCold' }, { id: 'IsHot', label: 'IsHot' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsRaining', label: 'IsRaining' }, { id: 'IsDay', label: 'IsDay' }
    ], correctOptionId: 'IsHot' },

    // 4 IF IsNight AND ___ THEN turnHeatingOn() ELSE turnHeatingOff() (condition)
    { id: 'c4', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'IsNight', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnHeatingOn()', fixedElse: 'turnHeatingOff()', options: [
      { id: 'IsRaining', label: 'IsRaining' }, { id: 'IsHot', label: 'IsHot' }, { id: 'IsDay', label: 'IsDay' }, { id: 'IsCold', label: 'IsCold' }
    ], correctOptionId: 'IsCold' },

    // 5 IF IsCold AND ___ THEN turnHeatingOff() ELSE turnHeatingOn() (condition)
    { id: 'c5', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'IsCold', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnHeatingOff()', fixedElse: 'turnHeatingOn()', options: [
      { id: 'NobodyHome', label: 'NobodyHome' }, { id: 'IsDay', label: 'IsDay' }, { id: 'IsHot', label: 'IsHot' }, { id: 'IsRaining', label: 'IsRaining' }
    ], correctOptionId: 'NobodyHome' },

    // 6 IF IsDay AND ___ THEN turnHeatingOff() ELSE turnHeatingOn() (condition)
    { id: 'c6', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'IsDay', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnHeatingOff()', fixedElse: 'turnHeatingOn()', options: [
      { id: 'IsRaining', label: 'IsRaining' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsHot', label: 'IsHot' }
    ], correctOptionId: 'IsHot' },

    // 7 IF IsHot AND ___ THEN turnAircoOn() ELSE turnAircoOff() (condition)
    { id: 'c7', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'IsHot', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnAircoOn()', fixedElse: 'turnAircoOff()', options: [
      { id: 'WindowsClosed', label: 'WindowsClosed' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsRaining', label: 'IsRaining' }
    ], correctOptionId: 'WindowsClosed' },

    // 8 IF IsCold AND IsRaining THEN ___  (action)
    { id: 'c8', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsCold', fixedRight: 'IsRaining', thenKeyword: 'THEN', blankAction: true, options: actionBlocks([
      { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'turnHeatingOn', label: 'turnHeatingOn()' }, { id: 'turnAircoOn', label: 'turnAircoOn()' }, { id: 'turnLampOff', label: 'turnLampOff()' }
    ]), correctOptionId: 'turnHeatingOn' },

    // 9 IF IsDay AND IsHot THEN ___  (action)
    { id: 'c9', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsDay', fixedRight: 'IsHot', thenKeyword: 'THEN', blankAction: true, options: actionBlocks([
      { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'turnHeatingOff', label: 'turnHeatingOff()' }, { id: 'turnAircoOff', label: 'turnAircoOff()' }, { id: 'turnLampOn', label: 'turnLampOn()' }
    ]), correctOptionId: 'turnHeatingOff' },

    // 10 IF IsNight AND IsCold THEN ___  (action)
    { id: 'c10', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsNight', fixedRight: 'IsCold', thenKeyword: 'THEN', blankAction: true, options: actionBlocks([
      { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'turnHeatingOn', label: 'turnHeatingOn()' }, { id: 'turnAircoOn', label: 'turnAircoOn()' }, { id: 'turnLampOn', label: 'turnLampOn()' }
    ]), correctOptionId: 'turnHeatingOn' },

    // 11 IF WindowOpen AND ___ THEN sendWarning() ELSE doNothing() (condition)
    { id: 'c11', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'WindowOpen', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'sendWarning()', fixedElse: 'doNothing()', options: [
      { id: 'HeatingOn', label: 'HeatingOn' }, { id: 'LampOn', label: 'LampOn' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsRaining', label: 'IsRaining' }
    ], correctOptionId: 'HeatingOn' },

    // 12 IF IsHot AND NobodyHome THEN ___  (action)
    { id: 'c12', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsHot', fixedRight: 'NobodyHome', thenKeyword: 'THEN', blankAction: true, options: actionBlocks([
      { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'turnHeatingOff', label: 'turnHeatingOff()' }, { id: 'turnAircoOff', label: 'turnAircoOff()' }, { id: 'sendWarning', label: 'sendWarning()' }
    ]), correctOptionId: 'turnAircoOff' },

    // 13 IF SmokeDetected THEN ___ ELSE doNothing() (action)
    { id: 'c13', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'SmokeDetected', blankAction: true, fixedElse: 'doNothing()', options: actionBlocks([
      { id: 'triggerAlarm', label: 'triggerAlarm()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'startAirco', label: 'startAirco()' }, { id: 'openCurtains', label: 'openCurtains()' }
    ]), correctOptionId: 'triggerAlarm' },

    // 14-16 other smart-device scenarios (code-like, some require action selection)
    // 1 IF MotionDetected AND ___ THEN turnLampOn() ELSE turnLampOff()
    { id: 's1', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'MotionDetected', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnLampOn()', fixedElse: 'turnLampOff()', options: [ { id: 'IsNight', label: 'IsNight' }, { id: 'IsDay', label: 'IsDay' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsHot', label: 'IsHot' } ], correctOptionId: 'IsNight' },

    // 2 IF NobodyHome AND ___ THEN turnHeatingOff() ELSE turnHeatingOn()
    { id: 's2', leftKeyword: 'IF', andKeyword: 'AND', blankPosition: 'after', fixedLeft: 'NobodyHome', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedAction: 'turnHeatingOff()', fixedElse: 'turnHeatingOn()', options: [ { id: 'IsDay', label: 'IsDay' }, { id: 'IsNight', label: 'IsNight' }, { id: 'IsCold', label: 'IsCold' }, { id: 'IsRaining', label: 'IsRaining' } ], correctOptionId: 'IsDay' },

    // 3 IF IsNight AND MotionDetected THEN ___
    { id: 's3', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsNight', fixedRight: 'MotionDetected', thenKeyword: 'THEN', blankAction: true, options: [ { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'turnHeatingOn', label: 'turnHeatingOn()' }, { id: 'turnAircoOn', label: 'turnAircoOn()' }, { id: 'turnCameraOff', label: 'turnCameraOff()' } ], correctOptionId: 'turnLampOn' },

    // 4 IF RobotVacuumBatteryLow THEN ___ ELSE continueCleaning()
    { id: 's4', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'RobotVacuumBatteryLow', blankAction: true, fixedElse: 'continueCleaning()', options: [ { id: 'returnToDock', label: 'returnToDock()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'startHeating', label: 'startHeating()' }, { id: 'openCurtains', label: 'openCurtains()' } ], correctOptionId: 'returnToDock' },

    // 5 IF DoorbellPressed AND NobodyHome THEN ___ ELSE openDoor()
    { id: 's5', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'DoorbellPressed', fixedRight: 'NobodyHome', thenKeyword: 'THEN', blankAction: true, elseKeyword: 'ELSE', fixedElse: 'openDoor()', options: [ { id: 'sendNotification', label: 'sendNotification()' }, { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'closeCurtains', label: 'closeCurtains()' }, { id: 'startHeating', label: 'startHeating()' } ], correctOptionId: 'sendNotification' },

    // 6 IF MotionDetected THEN ___ ELSE doNothing()
    { id: 's6', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'MotionDetected', blankAction: true, fixedElse: 'doNothing()', options: [ { id: 'startCameraRecording', label: 'startCameraRecording()' }, { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'openCurtains', label: 'openCurtains()' }, { id: 'stopHeating', label: 'stopHeating()' } ], correctOptionId: 'startCameraRecording' },

    // 7 IF FridgeDoorOpen THEN ___ ELSE keepCooling()
    { id: 's7', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'FridgeDoorOpen', blankAction: true, fixedElse: 'keepCooling()', options: [ { id: 'sendWarning', label: 'sendWarning()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'stopCooling', label: 'stopCooling()' }, { id: 'openCurtains', label: 'openCurtains()' } ], correctOptionId: 'sendWarning' },

    // 8 IF WashingDone THEN ___ ELSE continueWashing()
    { id: 's8', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'WashingDone', blankAction: true, fixedElse: 'continueWashing()', options: [ { id: 'sendNotification', label: 'sendNotification()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'startHeating', label: 'startHeating()' }, { id: 'lockDoor', label: 'lockDoor()' } ], correctOptionId: 'sendNotification' },

    // 9 IF RainDetected AND WindowOpen THEN ___ ELSE doNothing()
    { id: 's9', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'RainDetected', fixedRight: 'WindowOpen', thenKeyword: 'THEN', blankAction: true, elseKeyword: 'ELSE', fixedElse: 'doNothing()', options: [ { id: 'sendWarning', label: 'sendWarning()' }, { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'startAirco', label: 'startAirco()' }, { id: 'playMusic', label: 'playMusic()' } ], correctOptionId: 'sendWarning' },

    // 10 IF IsNight AND NobodyHome THEN ___
    { id: 's10', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsNight', fixedRight: 'NobodyHome', thenKeyword: 'THEN', blankAction: true, options: [ { id: 'activateSecurityMode', label: 'activateSecurityMode()' }, { id: 'startHeating', label: 'startHeating()' }, { id: 'openCurtains', label: 'openCurtains()' }, { id: 'turnAircoOn', label: 'turnAircoOn()' } ], correctOptionId: 'activateSecurityMode' },

    // 11 IF AirQualityBad THEN ___ ELSE doNothing()
    { id: 's11', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'AirQualityBad', blankAction: true, fixedElse: 'doNothing()', options: [ { id: 'startAirPurifier', label: 'startAirPurifier()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'closeCurtains', label: 'closeCurtains()' }, { id: 'stopHeating', label: 'stopHeating()' } ], correctOptionId: 'startAirPurifier' },

    // 12 IF WaterLeakDetected THEN ___ ELSE doNothing()
    { id: 's12', leftKeyword: 'IF', thenKeyword: 'THEN', elseKeyword: 'ELSE', fixedLeft: 'WaterLeakDetected', blankAction: true, fixedElse: 'doNothing()', options: [ { id: 'shutOffWater', label: 'shutOffWater()' }, { id: 'turnLampOn', label: 'turnLampOn()' }, { id: 'openCurtains', label: 'openCurtains()' }, { id: 'startHeating', label: 'startHeating()' } ], correctOptionId: 'shutOffWater' },

    // 13 IF IsMorning AND AlarmClockTriggered THEN ___
    { id: 's13', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'IsMorning', fixedRight: 'AlarmClockTriggered', thenKeyword: 'THEN', blankAction: true, options: [ { id: 'openCurtains', label: 'openCurtains()' }, { id: 'turnLampOff', label: 'turnLampOff()' }, { id: 'startHeating', label: 'startHeating()' }, { id: 'stopMusic', label: 'stopMusic()' } ], correctOptionId: 'openCurtains' },

    // 14 IF NobodyHome AND LightsOn THEN ___ ELSE doNothing()
    { id: 's14', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'NobodyHome', fixedRight: 'LightsOn', thenKeyword: 'THEN', blankAction: true, fixedElse: 'doNothing()', options: [ { id: 'turnLightsOff', label: 'turnLightsOff()' }, { id: 'turnHeatingOn', label: 'turnHeatingOn()' }, { id: 'openCurtains', label: 'openCurtains()' }, { id: 'startCameraRecording', label: 'startCameraRecording()' } ], correctOptionId: 'turnLightsOff' },

    // 15 IF TemperatureTooHigh AND WindowClosed THEN ___ ELSE doNothing()
    { id: 's15', leftKeyword: 'IF', andKeyword: 'AND', fixedLeft: 'TemperatureTooHigh', fixedRight: 'WindowClosed', thenKeyword: 'THEN', blankAction: true, fixedElse: 'doNothing()', options: [ { id: 'startAirco', label: 'startAirco()' }, { id: 'stopHeating', label: 'stopHeating()' }, { id: 'openCurtains', label: 'openCurtains()' }, { id: 'sendNotification', label: 'sendNotification()' } ], correctOptionId: 'startAirco' }
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
  // audio refs
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)
  const correctAudioRef = useRef<HTMLAudioElement | null>(null)
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null)
  // base fireworks audio and active cloned instances (so we can stop them on restart)
  const fireworksRef = useRef<HTMLAudioElement | null>(null)
  const activeFireworksRef = useRef<HTMLAudioElement[]>([])
  // lock to prevent multiple rapid submissions for the same scenario
  const checkingRef = useRef(false)
  const wrongInRoundRef = useRef(0)
  // track which scenarios we've shown in the current game to avoid repeats
  const usedScenarioIdsRef = useRef<Set<string>>(new Set())

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
        'het dag is': 'Overdag schijnt de zon, dan heb je geen lamp nodig.',
        'het nacht is': "'s Nachts is het donker buiten.",
        'het is warm': 'dan ga je zweten.',
        'het is koud': 'dan krijg je het koud.',
        'het is dag': 'Overdag schijnt de zon, dan heb je geen lamp nodig.',
        'het is nacht': "'s Nachts is het donker buiten.",
        'iswarm': 'dan ga je zweten.',
        'iscold': 'dan krijg je het koud.',
        'israining': 'dan neem je een paraplu mee.',
        'isday': 'Overdag schijnt de zon, dan heb je geen lamp nodig.',
        'isnight': "'s Nachts is het donker buiten."
      }

      // Per-scenario hint overrides: some scenarios should show a specific
      // hint regardless of which option labels are present. This makes the
      // hint behaviour depend on the scenario id instead of the chosen answer.
      const scenarioHints: Record<string, string[]> = {
        // t1: ALS ___ DAN zet de lamp aan
        't1': ["'s Nachts is het donker buiten."],
        // t2: ALS ___ DAN zet de lamp uit
        't2': ['Overdag schijnt de zon, dan heb je geen lamp nodig.'],
        // t3: ALS ___ DAN zet de verwarming aan (8-10)
        't3': ['Wat voel je als je het bibbert?'],
        // t4: ALS ___ DAN zet de verwarming uit (8-10)
        't4': ['Als je al zweet van de warmte, hoef je niet nog meer warmte.'],
        // t5: ALS ___ EN het regent DAN zet de lamp aan (8-10)
        't5': ['Het regent én het is donker buiten.'],
        // t6: ALS het nacht is EN ___ DAN is het nat buiten (8-10)
        't6': ['Wat maakt het nat buiten?'],
        // t7: ALS ___ EN het dag is DAN speel in het zwembad (8-10)
        't7': ['Wanneer ga je zwemmen?'],
        // t8: ALS het dag is EN ___ DAN is het nat buiten (8-10)
        't8': ['Hoe kan het dat het buiten nat is?'],
        // t9: ALS ___ EN het regent DAN zet de verwarming aan (8-10)
        't9': ['Wanneer wil je de verwarming aan zetten?'],
        // t10..t20: additional per-scenario hints provided by the user
        't10': ['Waarom zou je de lamp aanzetten?'],
        't11': ['Wanneer kan de verwarming uit?'],
        't12': ['Wanneer heb je geen lamp meer nodig?'],
        't13': ['Wanneer heb je geen lamp meer nodig?'],
        't14': ['Waarom moet je de verwarming aanzetten?'],
        't15': ['Wanneer heb je een paraplu nodig?'],
        't16': ['Wat voel je als het regent.'],
        't17': ['Wanneer kan je de verwarming uitzetten?'],
        't18': ['Waarom zet je de verwarming overdag aan?'],
        't19': ['Wanneer zet je de lamp aan?'],
        't20': ['Wanneer kan je de lamp uit doen?'],
        // d1..d30: smart-device scenarios for 8-10 (per the provided data)
        'd1': ['Denk aan temperatuur.'],
        'd2': ['Airco maakt de kamer koeler.'],
        'd3': ['Je hebt licht nodig.'],
        'd4': ['Buitenlicht helpt mee.'],
        'd5': ['Dan hoeft er minder warmte te komen.'],
        'd6': ['De kamer moet warmer worden.'],
        'd7': ['Er staat iemand aan de deur.'],
        'd8': ['In de ochtend wil je licht.'],
        'd9': ['’s Avonds wil je privacy.'],
        'd10': ['Tijd om op te staan.'],
        'd11': ['Zo bespaar je stroom.'],
        'd12': ['Ventilator maakt de kamer koeler.'],
        'd13': ['De kamer is aangenaam koel.'],
        'd14': ['Je praat tegen het apparaat.'],
        'd15': ['Dan rijdt hij niemand in de weg.'],
        'd16': ['Hij moet opladen.'],
        'd17': ['De camera ziet iets bewegen.'],
        'd18': ['Handig bij de voordeur.'],
        'd19': ['Anders verwarm je buiten.'],
        'd20': ['Wanneer gaat de wasmachine uit?'],
        'd21': ['De afwas is klaar.'],
        'd22': ['Het is bijna tijd om te slapen.'],
        'd23': ['Wat kan je in de badkamer doen?'],
        'd24': ['Zo verspil je minder water.'],
        'd25': ['Wanneer gaat de rookmelder af?'],
        'd26': ['Wanneer gaat de slimme koelkast piepen?'],
        'd27': ['Wanneer gaat de thermostaat op eco-stand?'],
        'd28': ['Wanneer gaat de ganglamp aan in het donker?'],
        'd29': ['Verwarmen is nodig als er iemand thuis is.'],
        'd30': ['Koelen is handig als er mensen thuis zijn.']
      }

      // If a per-scenario hint exists, prefer it. This ensures the hint is
      // specific to the scenario (not the option label).
      if (s && s.id && scenarioHints[s.id]) {
        return scenarioHints[s.id]
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
      } catch (e) {
          void e
          return HINT_BY_AGE[effectiveAge] || []
        }
  }, [currentScenario, effectiveAge])

  // ensure hint button is locked at start until mistakes threshold is reached
  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch (e) { /* ignore */ void e }
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
    } catch (e) { /* ignore */ void e }
    return () => {
      try { document.body.classList.remove(clsModal) } catch (e) { /* ignore */ void e }
      try { document.body.classList.remove(clsEnd) } catch (e) { /* ignore */ void e }
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
        } catch (e) {
          try { mod = await import('../PasswordZapper/passwordZapperFireworks.ts') } catch (e1) { /* ignore */ void e1 }
          void e
        }

        if (!mod) return
        const maybeInit = (mod as { default?: unknown })
        if (typeof maybeInit.default === 'function') {
          cleanup = (maybeInit.default as (c: HTMLCanvasElement) => (() => void))(canvasEl)
        }
      } catch (e) {
        // ignore failures — fireworks are decorative
        void e
      }
    })()
    return () => { try { if (cleanup) cleanup() } catch (e) { /* ignore */ void e } }
  }, [showEnd])

  // initialize audio elements once (skip in test env)
  useEffect(() => {
    if (isTestEnv) return
    try {
      bgAudioRef.current = new Audio(bgMusic)
      bgAudioRef.current.loop = true
      bgAudioRef.current.preload = 'auto'
      bgAudioRef.current.volume = 0.55

      correctAudioRef.current = new Audio(correctSound)
      correctAudioRef.current.preload = 'auto'
      correctAudioRef.current.volume = 0.9

      wrongAudioRef.current = new Audio(wrongSound)
      wrongAudioRef.current.preload = 'auto'
      wrongAudioRef.current.volume = 0.9
      // prepare base fireworks audio for end screen (clones will be played)
      try {
        const f = new Audio(fireworksSound)
        f.preload = 'auto'
        f.volume = 0.85
        fireworksRef.current = f
      } catch { fireworksRef.current = null }
    } catch (e) {
      /* ignore audio init errors */
      void e
    }

    return () => {
      try {
        if (bgAudioRef.current) {
          try { bgAudioRef.current.pause() } catch (e) { void e }
          try { bgAudioRef.current.src = '' } catch (e) { void e }
        }
        if (correctAudioRef.current) {
          try { correctAudioRef.current.pause() } catch (e) { void e }
          try { correctAudioRef.current.src = '' } catch (e) { void e }
        }
        if (wrongAudioRef.current) {
          try { wrongAudioRef.current.pause() } catch (e) { void e }
          try { wrongAudioRef.current.src = '' } catch (e) { void e }
        }
        // stop/clear any fireworks audio
        try {
          const clones = (activeFireworksRef.current || []).slice()
          for (const a of clones) {
            try { a.pause() } catch { /* ignore */ }
            try { a.currentTime = 0 } catch { /* ignore */ }
          }
          activeFireworksRef.current.length = 0
          if (fireworksRef.current) {
            try { fireworksRef.current.pause() } catch { /* ignore */ }
            try { fireworksRef.current.currentTime = 0 } catch { /* ignore */ }
            try { fireworksRef.current.src = '' } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      } catch { /* ignore cleanup errors */ }
    }
  }, [isTestEnv])

  // Play fireworks sound when end screen appears (use clones so multiple
  // overlapping plays are possible and we can stop them individually)
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

  // play / pause background music depending on game running state
  useEffect(() => {
    const audio = bgAudioRef.current
    if (!audio) return
    // play only when the actual gameplay is running (not intro/practice modals)
    if (running && !paused && !showIntro && !showPracticeStart && !showPracticeEnd && !showEnd) {
      try {
        const p = audio.play()
        if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {})
      } catch (e) {
        /* ignore play errors (autoplay blocked) */
        void e
      }
    } else {
      try { audio.pause() } catch (e) { void e }
    }
  }, [running, paused, showIntro, showPracticeStart, showPracticeEnd, showEnd])

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
    } catch (e) { void e; return }
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
    // reset used scenarios for a fresh practice run
    try { usedScenarioIdsRef.current.clear() } catch { /* ignore */ }
    {
      const s = pickNextScenario(pool)
      try { if (s && s.id) usedScenarioIdsRef.current.add(s.id) } catch { /* ignore */ }
      setCurrentScenario(s)
    }
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
    // clear used list for a fresh real game
    try { usedScenarioIdsRef.current.clear() } catch { /* ignore */ }
    {
      const s = pickNextScenario(pool)
      try { if (s && s.id) usedScenarioIdsRef.current.add(s.id) } catch { /* ignore */ }
      setCurrentScenario(s)
    }
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    setPaused(false)
    setRunning(true)
  }

  const restartGame = () => {
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
    // clear used list on full restart
    try { usedScenarioIdsRef.current.clear() } catch { /* ignore */ }
    {
      const s = pickNextScenario(pool)
      try { if (s && s.id) usedScenarioIdsRef.current.add(s.id) } catch { /* ignore */ }
      setCurrentScenario(s)
    }
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
    // choose a next scenario avoiding repeats until the pool is exhausted
    let candidates = Array.isArray(pool) ? pool.slice() : []
    // prefer unseen scenarios
    let unseen = candidates.filter((s) => !usedScenarioIdsRef.current.has(s.id))
    // if we've shown all scenarios already, reset the used set
    if (unseen.length === 0) {
      try { usedScenarioIdsRef.current.clear() } catch { /* ignore */ }
      unseen = candidates.slice()
    }
    if (unseen.length > 0) candidates = unseen
    // try to avoid immediate repeats when possible
    if (candidates.length > 1) {
      const alt = candidates.filter((s) => s.id !== currentScenario.id)
      if (alt.length > 0) candidates = alt
    }
    const next = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pickNextScenario(pool, currentScenario.id)
    // mark as used
    try { if (next && next.id) usedScenarioIdsRef.current.add(next.id) } catch { /* ignore */ }
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
      // play correct sound
      try {
        if (!isTestEnv && correctAudioRef.current) {
          try { correctAudioRef.current.currentTime = 0 } catch (e) { void e }
          const p = correctAudioRef.current.play()
          if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {})
        }
      } catch { /* ignore audio errors */ }
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
      // play wrong sound
      try {
        if (!isTestEnv && wrongAudioRef.current) {
          try { wrongAudioRef.current.currentTime = 0 } catch (e) { void e }
          const p = wrongAudioRef.current.play()
          if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {})
        }
      } catch { /* ignore audio errors */ }
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
    // pool changed (age switched) — reset used set and pick a fresh scenario
    try { usedScenarioIdsRef.current.clear() } catch { /* ignore */ }
    const s = pickNextScenario(pool, lastScenarioIdRef.current)
    try { if (s && s.id) usedScenarioIdsRef.current.add(s.id) } catch { /* ignore */ }
    setCurrentScenario(s)
    setSelectedOptionId(null)
  }, [pool])

  // We intentionally always render only one dropzone per scenario. Whether
  // that dropzone is for a condition (placed after the left keyword) or an
  // action (after THEN) is determined later during rendering based on
  // `currentScenario.blankAction`.

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

  const sanitizedLeft = sanitizeBoundaryEn(currentScenario.fixedLeft, 'left')
  const sanitizedRight = sanitizeBoundaryEn(currentScenario.fixedRight, 'right')

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

              {/* Render condition dropzone while respecting AND/blankPosition when applicable */}
              {!currentScenario.blankAction ? (
                currentScenario.andKeyword ? (
                  currentScenario.blankPosition === 'before' ? (
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

                      {currentScenario.fixedLeft ? <div className="nzs-fixed">{sanitizedLeft}</div> : null}
                      <div className="nzs-token nzs-token--kw">{currentScenario.andKeyword ?? 'EN'}</div>
                      {currentScenario.fixedRight ? <div className="nzs-fixed">{sanitizedRight}</div> : null}
                    </>
                  ) : (
                    <>
                      {currentScenario.fixedLeft ? <div className="nzs-fixed">{sanitizedLeft}</div> : null}
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
                      {currentScenario.fixedRight ? <div className="nzs-fixed">{sanitizedRight}</div> : null}
                    </>
                  )
                ) : (
                  // no AND: simple condition dropzone after leftKeyword
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

                    {currentScenario.fixedLeft ? <div className="nzs-fixed">{sanitizedLeft}</div> : null}
                    {currentScenario.fixedRight ? <div className="nzs-fixed">{sanitizedRight}</div> : null}
                  </>
                )
              ) : (
                // blankAction === true -> action is chosen after THEN; render left/and/right now
                <>
                  {currentScenario.fixedLeft ? <div className="nzs-fixed">{sanitizedLeft}</div> : null}
                  {(currentScenario.andKeyword || (currentScenario.fixedLeft && currentScenario.fixedRight)) ? <div className="nzs-token nzs-token--kw">{currentScenario.andKeyword ?? 'EN'}</div> : null}
                  {currentScenario.fixedRight ? <div className="nzs-fixed">{sanitizedRight}</div> : null}
                </>
              )}

              <div className="nzs-token nzs-token--kw">{currentScenario.thenKeyword}</div>

              {/* Action dropzone (for blankAction scenarios) or fixed action text */}
              {currentScenario.blankAction ? (
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
              ) : (
                <div className={`nzs-action ${effectiveAge === '14-16' ? 'nzs-action--code' : ''}`}>{currentScenario.fixedAction}</div>
              )}

              {/* Show ELSE if explicit elseKeyword present or a fixedElse is provided (fallback) */}
              {(currentScenario.elseKeyword || currentScenario.fixedElse) && (
                <>
                  <div className="nzs-token nzs-token--kw">{currentScenario.elseKeyword ?? 'ELSE'}</div>
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
            <p style={{ marginTop: 12, textAlign: 'left' }}>De oefenronde start nu. Je score telt tijdens het oefenen nog niet mee.</p>
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


