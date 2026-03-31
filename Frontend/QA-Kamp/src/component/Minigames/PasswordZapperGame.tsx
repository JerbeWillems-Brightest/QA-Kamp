import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom'
import "./PasswordZapperGame.css";
// ruimteschip asset
import shipSrc from "../../assets/Ruimteschip.png";
// komeet asset for password background
import komeetSrc from "../../assets/komeet.png";
import correctSrc from "../../assets/Correct.png";
import wrongSrc from "../../assets/Wrong.png";
import laserSrc from "../../assets/laser.png";

// Voorbeeld wachtwoorden per leeftijdsgroep
const passwordSets = {
  "8-10": {
    // Pool of 45 weak passwords shown on the image; each game will pick 15 random ones
    weak: [
      "123456","wachtwoord","1234","0000","1111","abcd","toets","laatmebinnen","houvanjouw","aap",
      "draak","zon","voetbal","honkbal","prinses","welkom","schaduw","superman","pokemon","starwars",
      "batman","1a2b3c","123123","abc123","wachtwoord1","12345","654321","555555","jager","bob",
      "knop","links","bloem","koekje","voetbal123","spelen","kaas","987654","pas","teen",
      "liefdevol","kat","baby","bingo","vrouw"
    ],
      strong: [
        "Zon!Maan9",
        "Hond!Kat5",
        "Boom@Vis7",
        "Roos#Appel3",
        "Ster!Boot4",
        "Wolk@Fiets6",
        "Lamp#Slang2",
        "Tent!Gras8",
        "Berg@Zee5",
        "Vlam!Sneeuw3",
        "Peer#Dak7",
        "Maan@Brug4",
        "Krab!Woud6",
        "Deur#Ijs9",
        "Rok!Wind2",
        "Vuur@Glas5",
        "Stoel!Regen8",
        "Bal#Mist3",
        "Mes!Zand7",
        "Nacht@Brood4",
        "Kip!Steen6",
        "Doos#Zee2",
        "Licht!Weg9",
        "Tuin@Klok5",
        "Spin!Goud3",
        "Hek#Vogel8",
        "Tak!Zout4",
        "Mond@Bos7",
        "Vel!Rots2",
        "Kern#Ruit6",
        "Poot!Wolk9",
        "Graf@Sap3",
        "Hars!Brug5",
        "Geit#Wind8",
        "Roos@Ijs4",
        "Dak!Peer2",
        "Kool#Nacht7",
        "Vlieg!Steen5",
        "Zeil@Gras3",
        "Muur!Brood9",
        "Stof#Rok6",
        "Vos!Lamp4",
        "Glas@Berg2",
        "Slak!Deur8",
        "Neus#Vuur5",
        "Tand!Krab3",
        "Brug@Stoel7",
        "Kist!Zeil6",
        "Goud#Spin9",
        "Oog!Muur4",
        "Zand@Hek2",
        "Riet!Licht7",
        "Boom#Mes5",
        "Ster@Doos3",
        "Haas!Kern8",
        "Tent#Oog6",
        "Wolk!Vel4",
        "IJzer@Neus2",
        "Duif!Stof9",
        "Bos#Tand7",
        "Vlam@Kist5",
        "Steen!Riet3",
        "Peer!Muur6",
        "Dak@Haas8",
        "Ijs#Duif4",
        "Brood!Berg2",
        "Nacht@Tuin9",
        "Sap!Geit7",
        "Rok#Poot5",
        "Ruit!Vos3",
        "Wind@Slak8",
        "Gras!Kool6",
        "Brug#Vlieg4",
        "Kip@Zeil2",
        "Mes!Roos9",
        "Tak#Glas7",
        "Vuur!Slak5",
        "Maan@Tand3",
        "Lamp!Goud8",
        "Graf#Zand6",
        "Hars@Oog4",
        "Geit!Nacht2",
        "Spin#Berg9",
        "Doos!Tuin7",
        "Licht@Rok5",
        "Weg!Kist3",
        "Klok#Vlam8",
        "Stoel!Sap6",
        "Brood@Haas4",
        "Neus!Riet2",
        "Tuin#Stof9",
        "Vogel!Zout7",
        "Hek@Krab5",
        "Mist!Vel3",
        "Bal#Bos8",
        "Rots!Wolk6",
        "Steen@Deur4",
        "IJzer!Klok2",
        "Vos#Peer9",
        "Slang!Goud7",
        "Duif@Mist5",
        "Krab!Dak3",
        "Zee#Ster8",
        "Vis!Kern6",
        "Boom@Nacht4",
        "Glas!Brug2",
        "Tak#Vlieg9",
        "Woud!Graf7",
        "Zout@Maan5",
        "Roos!Hars3",
        "Kool#Tand8",
        "Slak!Ruit6",
        "Nacht@Vuur4",
        "Brood!Hek2",
        "Geit#Licht9",
        "Zeil!Berg7",
        "Muur@Haas5",
        "Deur!Spin3",
        "Tand#Klok8",
        "Vis!Steen6",
        "IJzer@Riet4",
        "Vuur!Kool2",
        "Brug#Neus9",
        "Graf!Zeil7",
        "Sap@Duif5",
        "Riet!Maan3",
        "Kist#Vlam8",
        "Oog!Stoel6",
        "Stof@Geit4",
        "Poot!Vis2",
        "Klok#Woud9",
        "Haas!Weg7",
        "Nacht@Mes5",
        "Ster!Mist3",
        "Zee#Lamp8",
        "Kip!Brug6",
        "Tuin@Slang4",
        "Glas!Vogel2",
        "Rok#Hars9",
        "Doos!Wind7",
        "Ruit@Kip5",
        "Berg!Tuin3",
        "Vlieg#Doos8",
        "Zand!Zee6",
        "Wolk@Bal4",
        "Tent!Kern2"
      ]
  },
  "11-13": {
    weak: [
      "123abd","wachtwoord1","voetbal22","baas123","laatmebinnen","houvanjou","aap123","draak99","sterk2024","abc456",
      "thomas2012","sophie2013","telefoon123","internet123","12345678","11111111","toetsenbord123","belg123","drol123","pokemon25",
      "minecraft1","roblox2023","voetbalclub9","frankrijk123","batman123","superman1","nederland1","welkom123","zomer2024","winter2023",
      "school123","thuis2024","hallo1234","test1234","gebruiker1234","veilig1","pas1234","Zee123","corona2020","vakantie1",
      "geheim123","thomas!!","Wachtwoord1","wachtwoord!1","Voetbal!1","Baas!23","Zomer!24","School!1","Hallo!23","Test@123",
      "Gebruiker@2024","Zee@1","Sophie@13","Thomas@12","Draak@99","Batman@1","Pokemon@25","Roblox@23","Minecraft@1","Welkom@123"
    ],
    strong: [
      "M@ngo$Regen9",
      "Bl@uw#Fiets7",
      "Taart!Wolken4",
      "Citroen&Boot22",
      "Paars!Ladder6",
      "Vork@Sneeuw3",
      "Regen#Tafel8",
      "Ijsbeer!Lamp5",
      "Muziek@Rots2",
      "Vlinder#Stoel9",
      "Koala!Fiets7",
      "Donder@Lepel4",
      "Paraplu#Vis6",
      "Gember!Brug3",
      "Laptop@Wolk8",
      "Krokodil!Bal5",
      "Roos#Ladder2",
      "Muziek!Krab9",
      "Tomaat@Deur7",
      "Brood#Wolk4",
      "Gitaar!Rots6",
      "Paars@Hamer3",
      "Tijger#Soep8",
      "Kaars!Brug5",
      "Sneeuw@Trommel2",
      "Koelkast!Tak9",
      "Mango#Vlieg7",
      "Boter!Steen4",
      "Zwaan@Doos6",
      "Kruik#Ster3",
      "Ananas!Weg8",
      "Slak@Boek5",
      "Regen#Stoel2",
      "Komeet!Brood9",
      "Hamer@Bloem7",
      "Vlieg#Soep4",
      "Paraplu!Ster6",
      "Dak@Muziek3",
      "Krokus#Boot8",
      "Ijsbeer@Deur5",
      "Lap!Regen2",
      "Kaart#Vlinder9",
      "Peer!Komeet7",
      "Zaag@Wolk4",
      "Gitaar#Stoel6",
      "Tomaat!Steen3",
      "Vis@Ladder8",
      "Gember#Bos5",
      "Kaars!Boek2",
      "Koala@Regen9",
      "Roos!Hamer7",
      "Laptop#Tak4",
      "Sneeuw!Vis6",
      "Zwaan@Brood3",
      "Donder#Doos8",
      "Ananas!Brug5",
      "Paars@Slak2",
      "Muziek#Weg9",
      "Tijger!Bloem7",
      "Mango@Stoel4",
      "Regen#Zaag6",
      "Koelkast!Ster3",
      "Kruik@Vlieg8",
      "Boter#Komeet5",
      "Vlinder!Soep2",
      "Kaart@Tak9",
      "Gitaar#Slak7",
      "Peer!Lamp4",
      "Fiets@Roos6",
      "Boot#Muziek3",
      "Steen!Kaars8",
      "Bloem@Zaag5",
      "Deur#Tijger2",
      "Wolk!Ananas9",
      "Stoel@Donder7",
      "Brug#Roos4",
      "Ladder!Zwaan6",
      "Krab@Gitaar3",
      "Tak#Koelkast8",
      "Weg!Kruik5",
      "Vis@Sneeuw2",
      "Boek#Paars9",
      "Doos!Gember7",
      "Ster@Koala4",
      "Soep#Vlinder6",
      "Rots!Mango3",
      "Hamer@Peer8",
      "Bos#Laptop5",
      "Lamp!Fiets2",
      "Brood@Krokus9",
      "Paraplu#Ijsbeer7",
      "Komeet!Zaag4",
      "Slak@Brug6",
      "Vork#Wolk3",
      "Kaart!Dak8",
      "Regen@Fiets5",
      "Muziek#Krokodil2",
      "Stoel!Ananas9",
      "Tak@Paraplu7",
      "Bloem#Doos4",
      "Vis!Gitaar6",
      "Boot@Tijger3",
      "Steen#Roos8",
      "Wolk!Boter5",
      "Deur@Krab2",
      "Ladder#Peer9",
      "Kaars!Weg7",
      "Gember@Zwaan4",
      "Koelkast#Tak6",
      "Hamer!Wolk3",
      "Zaag@Donder8",
      "Brug#Mango5",
      "Kruik!Stoel2",
      "Vlinder@Brood9",
      "Lap#Gitaar7",
      "Ijsbeer!Vork4",
      "Komeet@Roos6",
      "Sneeuw#Boot3",
      "Krokus!Soep8",
      "Slak@Ster5",
      "Doos#Lamp2",
      "Paars!Vis9",
      "Tomaat@Zaag7",
      "Weg#Kaars4",
      "Rots!Muziek6",
      "Peer@Krokodil3",
      "Fiets#Tak8",
      "Bos!Paraplu5",
      "Dak@Ananas2",
      "Bloem#Hamer9",
      "Vis!Kruik7",
      "Regen@Bos4",
      "Gitaar#Weg6",
      "Koala!Vork3",
      "Brood@Tak8",
      "Zwaan#Steen5",
      "Trommel!Bloem2",
      "Donder@Peer9",
      "Lamp#Krab7",
      "Soep!Regen4",
      "Stoel@Ijsbeer6"
    ]
  },
  "14-16": {
    weak: [
      "Hallo123","Login!123","Qwerty123","Gebruiker01","Admin?2024","Password?2025","Login2025","School?99","Welkom!99","Admin01",
      "Admin!2025","Welkom!99","Welkom?2025","Qwerty!2024","Welkom99","Gebruiker?123","Gebruiker!2025","Hallo99","Password123","Hallo!123",
      "Welkom?01","School!2025","Hallo01","Qwerty?2025","Qwerty2025","Welkom?2024","Voetbal?123","Login?2024","Qwerty!99","Gebruiker!2025",
      "Hallo?2024","Gebruiker123","Password01","MijnNaam!01","Voetbal?99","Login2025","Hallo?123","Qwerty?2025","Password2025","School!01",
      "Admin!123","Welkom?01","Welkom!2024","Voetbal123","School!01","Login2025","Welkom2024","Voetbal!99","Qwerty123","Password123",
      "Voetbal?123","Hallo!99","Voetbal!123","Hallo!2025","Voetbal?01","School!2025","MijnNaam?99","Login01","School?2025","Qwerty?99",
      "MijnNaam01","Welkom?2024","MijnNaam?99","Login2024","Qwerty?2024","Gebruiker!01","MijnNaam!2025","School2025","School!123","Voetbal?01",
      "School?01","Login2025","Hallo01","Password?2024"
    ],
    strong: [
      "RegenVallen!54",
      "TijgerEten?99",
      "PizzaBouwen!77",
      "WinterRennen#90",
      "RobotRennen!61",
      "RegenLachen@26",
      "RobotEten#14",
      "RobotBouwen@41",
      "ZomerBouwen?73",
      "PizzaDromen#77",
      "DinoVallen?50",
      "KattenSpringen#50",
      "NinjaDromen@66",
      "FietsSpringen!84",
      "ZomerRennen#49",
      "KoffieSpringen#39",
      "MarsSpelen?42",
      "RegenBouwen?59",
      "KattenLachen!17",
      "NinjaEten@95",
      "RegenDenken#65",
      "DinoLachen!28",
      "DinoRennen#76",
      "SterrenRennen!16",
      "KoffieVallen#51",
      "RegenVliegen!56",
      "SpelDenken@53",
      "RobotDromen?49",
      "RegenLachen?86",
      "RegenSpringen!85",
      "SterrenVallen?61",
      "ZomerDromen@61",
      "SpelBouwen#93",
      "WinterEten?13",
      "DinoVallen?10",
      "SpelVliegen!28",
      "RobotDromen#33",
      "SterrenEten@57",
      "BanaanBouwen#36",
      "KoffieDenken!33",
      "NinjaDromen!54",
      "SpelRennen!68",
      "KoffieDromen@25",
      "RobotVallen?52",
      "NinjaSpringen?91",
      "RegenVallen@72",
      "BanaanSpelen?70",
      "RobotVliegen?43",
      "BanaanDenken!51",
      "WinterEten?71",
      "NinjaEten#52",
      "NinjaVallen@34",
      "PizzaRennen!38",
      "RegenRennen!10",
      "DinoSpringen#75",
      "FietsRennen?83",
      "TijgerDenken?66",
      "SpelEten@74",
      "KoffieLachen#69",
      "DinoEten@86",
      "BanaanEten#87",
      "WinterLachen!26",
      "ZomerSpringen!19",
      "RobotEten#12",
      "FietsEten@83",
      "RegenEten#21",
      "MarsSpelen!50",
      "WinterEten@61",
      "MarsSpringen!45",
      "SpelSpelen#72",
      "KoffieVallen!60",
      "TijgerBouwen@14",
      "SterrenDromen#52",
      "SpelEten@95",
      "ZomerVliegen#56",
      "BanaanRennen!96",
      "KattenBouwen#46",
      "FietsRennen#22",
      "BanaanEten?86",
      "RobotDenken@49",
      "BanaanDromen#22",
      "WinterRennen#48",
      "DinoRennen#26",
      "RegenEten!37",
      "RobotSpringen?91",
      "SpelEten#97",
      "DinoDromen@82",
      "BanaanRennen#25",
      "ZomerRennen@53",
      "PizzaEten?34",
      "SterrenEten!50",
      "DinoDenken?81",
      "NinjaVliegen#22",
      "BanaanEten?93",
      "FietsSpringen@95",
      "RobotVallen@92",
      "FietsDromen!70",
      "BanaanSpelen!19",
      "PizzaSpelen@29",
      "SpelEten#58",
      "RobotSpelen@11",
      "SpelEten#93",
      "BanaanRennen@13",
      "BanaanEten!99",
      "KattenSpelen#16",
      "TijgerBouwen@47",
      "WinterBouwen?90",
      "NinjaVallen@94",
      "RegenRennen@74",
      "DinoSpringen#20",
      "PizzaEten@58",
      "SterrenBouwen!72",
      "NinjaSpringen#30",
      "SpelSpelen?38",
      "KoffieVallen#94",
      "MarsBouwen@97",
      "KattenSpelen@85",
      "RobotDromen#95",
      "TijgerVallen!15",
      "FietsSpelen!97",
      "SterrenEten?39",
      "MarsVallen@82",
      "PizzaSpringen#10",
      "PizzaSpringen#81",
      "WinterLachen@79",
      "RobotVliegen?55",
      "RegenEten#89",
      "TijgerSpelen@58",
      "NinjaEten#62",
      "DinoVliegen?60",
      "MarsDenken@26",
      "RegenBouwen!37",
      "RobotLachen#30",
      "BanaanVliegen!90"
    ]
  }
};

// Feedback messages (Dutch) provided by user
const goodFeedbackList = [
  'Goed gedaan',
  'Juist gekozen',
  'Heel goed gezien',
  'Knap werk',
  'Dat klopt helemaal',
  'Sterk wachtwoord gekozen',
  'Goed opgelet',
  'Helemaal juist',
  'Slim gekozen',
  'Perfect gezien'
];

const badFeedbackList = [
  'Niet juist gekozen',
  'Dat is fout',
  'Oeps, niet goed',
  'Jammer, fout antwoord',
  'Probeer nog eens',
  'Bijna, maar fout',
  'Niet sterk genoeg',
  'Denk nog eens',
  'Te makkelijk wachtwoord',
  'Dat klopt niet'
];

function randomFrom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

// Helper om wachtwoorden te mixen en random te tonen
function shuffle<T>(array: T[]): T[] {
  return array
    .map((a) => [Math.random(), a] as [number, T])
    .sort((a, b) => a[0] - b[0])
    .map((a) => a[1]);
}

// Helper to extract status and message from unknown errors without using `any`.
function getErrorInfo(err: unknown): { status: number | null; message: string } {
  if (!err) return { status: null, message: '' }
  if (err instanceof Error) {
    // our API helpers sometimes attach a numeric `status` property to Error
    const anyErr = err as Error & { status?: number }
    return { status: typeof anyErr.status === 'number' ? anyErr.status : null, message: anyErr.message }
  }
  try {
    const obj = err as Record<string, unknown>
    const resp = (obj.response as Record<string, unknown> | undefined) ?? undefined
    const status = typeof obj.status === 'number' ? obj.status : (resp && typeof resp.status === 'number' ? (resp.status as number) : null)
    const message = typeof obj.error === 'string' ? obj.error : typeof obj.message === 'string' ? obj.message : JSON.stringify(obj)
    return { status, message }
  } catch {
    return { status: null, message: String(err) }
  }
}

interface PasswordItem {
  value: string;
  isWeak: boolean;
  zapped: boolean;
  missed: boolean;
  // per-item fall duration in seconds for the falling animation
  fallDuration?: number;
  // the immutable base duration used to derive fallDuration via a multiplier
  baseFallDuration?: number;
}

interface Props {
  ageGroup: "8-10" | "11-13" | "14-16";
  // optional testing hook: provide deterministic initial passwords
  initialPasswords?: PasswordItem[];
}

const PasswordZapperGame: React.FC<Props> = ({ ageGroup, initialPasswords }) => {
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  // currentIdx removed: we use per-lane indices and zapAt/skipAt handlers
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null);
  // number of passwords the user has processed (zap or skip)
  const [processed, setProcessed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [zappedWeak, setZappedWeak] = useState(0);
  const [missedWeak, setMissedWeak] = useState(0);
  const [zappedStrong, setZappedStrong] = useState(0);
  // temporary image overrides for specific password indices (idx -> src)
  const [imgOverrides, setImgOverrides] = useState<Record<number, string>>({});
  // lasers currently in-flight
  const [lasers, setLasers] = useState<Array<{
    id: number;
    left: number; // start left relative to container
    top: number; // start top relative to container
    translateX: number;
    translateY: number;
    angle: number; // in radians
    targetIdx: number;
    anim?: boolean;
  }>>([]);
  // persisted high score for this minigame (per age group)
  const [highScore, setHighScore] = useState<number | null>(null);
  const [isNewHigh, setIsNewHigh] = useState(false);
  // explosions removed - we no longer render explosion overlays
  // ref to asteroid container so we can compute coordinates
  const asteroidRef = React.useRef<HTMLDivElement | null>(null);
  // fireworks canvas ref for end screen
  const fwCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  // same size as .pz-laser in CSS (desktop default) - used to center the image
  const LASER_SIZE = 128;
  // lanes: indices of passwords currently visible in each lane
  // default to 3 lanes; this will be resized later when the effectiveAgeGroup is known
  const [lanes, setLanes] = useState<Array<number | null>>([null, null, null]);
  const lanesRef = React.useRef<Array<number | null>>(lanes);
  useEffect(() => { lanesRef.current = lanes; }, [lanes]);
  // next password index to load into an empty lane
  const [nextToLoad, setNextToLoad] = useState(0);
  // Keep a copy of the original pool to spawn new items when exhausted
  const originalPoolRef = React.useRef<PasswordItem[] | null>(null);
  // refs to keep current snapshots for synchronous allocation when multiple lanes finish
  const passwordsRef = React.useRef<PasswordItem[]>(passwords);
  const nextToLoadRef = React.useRef<number>(nextToLoad);
  // track indices that have had a laser shot at them (only one shot allowed per comet)
  const shotFiredRef = React.useRef<Set<number>>(new Set());
  // endless mode toggle - when true, kometen keep spawning
  const endless = true;
  // cap to end the game after this many processed items
  // determined by ageGroup: 8-10 -> 15, 11-13 -> 25 (default), 14-16 -> 30
  

  // Deterministic normalization: prefer sessionStorage.playerCategory, then prop, then URL.
  function inferAgeGroupFromString(s: string | null | undefined): "8-10" | "11-13" | "14-16" {
    const raw = String(s || '').toLowerCase();
    try {
      if (/8\D*10/.test(raw)) return '8-10';
      if (/11\D*13/.test(raw)) return '11-13';
      if (/14\D*16/.test(raw)) return '14-16';
      const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
      if (nums.length >= 1) {
        const n = nums[0];
        if (n <= 10) return '8-10';
        if (n <= 13) return '11-13';
        return '14-16';
      }
      if (raw.includes('8')) return '8-10';
      if (raw.includes('11') || raw.includes('12') || raw.includes('13')) return '11-13';
      if (raw.includes('14') || raw.includes('15') || raw.includes('16')) return '14-16';
    } catch {
      // fall through
    }
    return '11-13';
  }

  const sessionCat = (typeof window !== 'undefined') ? sessionStorage.getItem('playerCategory') : null;
  const urlAge = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search || '').get('age') : null;
  const candidatePriority = sessionCat || (ageGroup as string | null) || urlAge || null;
  const normalizedAgeGroup: "8-10" | "11-13" | "14-16" = inferAgeGroupFromString(candidatePriority);
  // debug log removed

  // examples per age group used in the start modal
  const examples: { weak: string; strong: string } = (() => {
    switch (normalizedAgeGroup) {
      case '8-10': return { weak: '🧾✨', strong: 'Zon!Maan9' };
      case '11-13': return { weak: 'abc123', strong: 'Hond!Kat5' };
      case '14-16': return { weak: 'qwerty123', strong: 'T!jger@8' };
      default: return { weak: '🧾✨', strong: 'Zon!Maan9' };
    }
  })();

  // Use normalizedAgeGroup as the effective age group (no UI override in start modal)
  const effectiveAgeGroup: "8-10" | "11-13" | "14-16" = normalizedAgeGroup;

  // compute max lanes based on the effective age group
  const MAX_LANES = effectiveAgeGroup === '14-16' ? 4 : 3;

  // initialize lanes array when component mounts / when effectiveAgeGroup changes
  useEffect(() => {
    setLanes(new Array(MAX_LANES).fill(null));
  }, [MAX_LANES]);

  // Debug: help diagnose mismatches in runtime environments
  // debug log removed

  // Diagnostic values are rendered inline in the debug badge below (avoid unused-var lint errors)

  const MAX_PROGRESS = effectiveAgeGroup === '8-10' ? 15 : effectiveAgeGroup === '14-16' ? 30 : 25;
  // whether the player has started the game (controls the start modal)
  const [started, setStarted] = useState(false);
  // base and current fall duration (in seconds). We expose this via a CSS variable
  // so the pz-fall animation uses the current speed. Base values chosen so higher
  // age groups start slightly faster.
  // Increase base durations so initial comets fall more slowly and end speeds remain reasonable
  const [baseFallDuration] = useState<number>(() => effectiveAgeGroup === '8-10' ? 24 : effectiveAgeGroup === '11-13' ? 19 : 15);
  const [fallDuration, setFallDuration] = useState<number>(baseFallDuration);
  // multiplier applied to each item's baseFallDuration to compute final fallDuration
  const [fallMultiplier, setFallMultiplier] = useState<number>(1);
  // apply the current fallMultiplier to all existing passwords
  const applyFallMultiplierToAll = useCallback((mult: number) => {
    setPasswords((prev) => prev.map(p => ({ ...p, fallDuration: (p.baseFallDuration ?? p.fallDuration ?? baseFallDuration) * mult })));
  }, [baseFallDuration]);

  // keep a ref of current multiplier so tweens read the latest value without stale closures
  const fallMultiplierRef = React.useRef<number>(fallMultiplier);
  useEffect(() => { fallMultiplierRef.current = fallMultiplier; }, [fallMultiplier]);

  // tween helper: smoothly interpolate multiplier from current to target over duration (ms)
  const multiplierTweenRef = React.useRef<number | null>(null);
  const tweenFallMultiplier = useCallback((target: number, durationMs = 600) => {
    // cancel previous tween
    if (multiplierTweenRef.current) cancelAnimationFrame(multiplierTweenRef.current);
    const start = performance.now();
    const from = fallMultiplierRef.current ?? 1;

    // easing (easeInOutQuad)
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    function step(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      const eased = ease(t);
      const cur = from + (target - from) * eased;
      // update state/ref and apply to items
      try {
        setFallMultiplier(cur);
        fallMultiplierRef.current = cur;
        applyFallMultiplierToAll(cur);
        // update CSS fallback duration so any elements without per-item style also feel it
        setFallDuration(Math.max(0.2, baseFallDuration * cur));
      } catch { /* ignore */ }

      if (t < 1) {
        multiplierTweenRef.current = requestAnimationFrame(step);
      } else {
        // finalize to exact target
        setFallMultiplier(target);
        fallMultiplierRef.current = target;
        applyFallMultiplierToAll(target);
        setFallDuration(Math.max(0.2, baseFallDuration * target));
        multiplierTweenRef.current = null;
      }
    }

    multiplierTweenRef.current = requestAnimationFrame(step);
  }, [applyFallMultiplierToAll, baseFallDuration]);
  // speedLevel tracks how many speed increments have been applied (0 = base, 1 = first increase, 2 = second increase)
  const [speedLevel, setSpeedLevel] = useState<number>(0);
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const navigate = useNavigate()

  // Toggle a body-level class so other UI (hint/pause/question, score, progress, ship)
  // can be hidden via CSS while the start modal is visible.
  useEffect(() => {
    const cls = 'pz-modal-open';
    if (!started || showHelp || showHint) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => { document.body.classList.remove(cls); };
  }, [started, showHelp, showHint]);

  // Pause handling: listen for global pause event and show pause modal
  useEffect(() => {
    const onPause = () => { try { setPaused(true) } catch { /* ignore */ } }
    const onHelp = () => { try { setShowHelp(true) } catch { /* ignore */ } }
    const onHint = () => { try { setShowHint(true); setPaused(true); } catch { /* ignore */ } }
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelp as EventListener)
    window.addEventListener('minigame:hint', onHint as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelp as EventListener)
      window.removeEventListener('minigame:hint', onHint as EventListener)
    }
  }, [])

  // Toggle a body-level class while paused so CSS can freeze animations if desired
  useEffect(() => {
    const cls = 'pz-paused'
    if (paused) {
      try { document.body.classList.add(cls) } catch { /* ignore */ }
    } else {
      try { document.body.classList.remove(cls) } catch { /* ignore */ }
    }
    return () => { try { document.body.classList.remove(cls) } catch { /* ignore */ } }
  }, [paused]);

  // Helper to set the player's status. This is a small placeholder that
  // sends the status to a backend endpoint if available. Replace the URL
  // or integrate with your existing user context / socket code as needed.
  const setPlayerStatus = useCallback(async (status: 'online' | 'offline') => {
    try {
      const playerNumber = sessionStorage.getItem('playerNumber') || ''
      const sessionStorageId = sessionStorage.getItem('playerSessionId')
      const localStorageId = localStorage.getItem('currentSessionId')
      const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')

      // If we have a sessionId + playerNumber, prefer using the session-specific API
      if (sid && playerNumber) {
        try {
          const api = await import('../../api')
          if (status === 'online') {
            await api.setPlayerOnline(sid, String(playerNumber))
            try { sessionStorage.setItem('playerOnlineLocked', 'true') } catch { /* ignore */ }
            try { if (!sessionStorage.getItem('playerSessionId')) sessionStorage.setItem('playerSessionId', sid) } catch { /* ignore */ }
          } else {
            // offline
            await api.setPlayerOffline(sid, String(playerNumber))
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
          }
          return
        } catch (err: unknown) {
          const info = getErrorInfo(err)
          const statusCode = info.status
          const msg = info.message
          // 409 = already online (non-fatal) -> ignore. 404 = not found -> force logout
          if (statusCode === 409 || /already online/i.test(msg) || /already exists/i.test(msg)) {
            // already online on server: non-fatal race. Intentionally ignore without logging.
            // continue to update localStorage fallback
          } else if (statusCode === 404 || /not found|player not found|session not found/i.test(msg)) {
            // Session/player gone on server - force logout
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
            try { navigate('/') } catch { /* ignore */ }
            return
          } else {
            console.warn('setPlayerStatus: api call failed, will update localStorage fallback', msg)
          }
        }
      }

      // Fallback: update localStorage.onlinePlayers so organizer UI sees presence in SPA-only setups
      const storedVal = String(sessionStorage.getItem('playerNumber') || '')
      const padded = storedVal.padStart(3, '0')
      if (status === 'online') {
        try {
          const raw = localStorage.getItem('onlinePlayers')
          const arr = raw ? JSON.parse(raw) as string[] : []
          const hasStored = Array.isArray(arr) && (arr.includes(storedVal) || arr.includes(padded))
          if (!hasStored) {
            // store the normalized 3-digit form so all tabs/components compare equal
            const next = [...arr.filter(Boolean), padded]
            localStorage.setItem('onlinePlayers', JSON.stringify(next))
            try { localStorage.setItem('onlinePlayers_last_update', String(Date.now())) } catch { /* ignore */ }
            try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(next) })) } catch { /* ignore */ }
          }
        } catch { try { localStorage.setItem('onlinePlayers', JSON.stringify([storedVal])) } catch { /* ignore */ } }
      } else {
        // offline: remove from localStorage list
        try {
          const raw2 = localStorage.getItem('onlinePlayers')
          const arr2 = raw2 ? JSON.parse(raw2) as string[] : []
          const plain = String(storedVal)
          const padded2 = plain.padStart(3, '0')
          const filtered = Array.isArray(arr2) ? arr2.filter(x => (String(x) !== plain && String(x) !== padded2)) : []
          localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) })) } catch { /* ignore */ }
        } catch { /* ignore */ }
      }
    } catch {
      // ignore errors; presence update is best-effort
    }
  }, [navigate]);

  // Helper to mark player online in the same way WaitingRoom does: try server
  // then fall back to localStorage so organizer can see presence.
  // ...existing code... (single markOnline implementation is defined earlier)

  // When the player starts the game, mark them online. When they finish or
  // the component unmounts, mark them offline (like leaving the waiting room).
  // presence is handled explicitly on start/finish; no automatic flip here


  // Toggle a body-level class while the end screen is visible so other UI
  // (hint/pause/help buttons, score/progress/ship) can be hidden via CSS.
  useEffect(() => {
    const cls = 'pz-end-open';
    if (showEnd) {
      document.body.classList.add(cls);
      // ensure the start-modal class is removed if still present
      document.body.classList.remove('pz-modal-open');
    } else {
      document.body.classList.remove(cls);
    }
    return () => { document.body.classList.remove(cls); };
  }, [showEnd]);

  // Load persisted high score for this age group on mount / when age changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const key = `pz_highscore_passwordzapper_${effectiveAgeGroup}`;
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const n = parseInt(raw, 10);
          if (!Number.isNaN(n)) setHighScore(n);
        }
      }
    } catch { /* ignore */ }
  }, [effectiveAgeGroup]);

  // Helper to mark player online in the same way WaitingRoom does: try server
  // then fall back to localStorage so organizer can see presence.
  const markOnline = useCallback(async () => {
    try {
      const playerNumber = sessionStorage.getItem('playerNumber') || ''
      const sessionStorageId = sessionStorage.getItem('playerSessionId')
      const localStorageId = localStorage.getItem('currentSessionId')
      const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
      const storedVal = String(playerNumber)
      const padded = storedVal.padStart(3, '0')

      if (sid) {
        // If login flow already acquired an online-lock, don't call setPlayerOnline again.
        // This avoids 409 responses when multiple tabs/flows race to mark the same player online.
        const onlineLocked = (() => {
          try { return sessionStorage.getItem('playerOnlineLocked') === 'true' } catch { return false }
        })()

        if (!onlineLocked) {
          try {
            const api = await import('../../api')
            await api.setPlayerOnline(sid, String(playerNumber))
            try { sessionStorage.setItem('playerOnlineLocked', 'true') } catch { /* ignore */ }
            try { if (!sessionStorage.getItem('playerSessionId')) sessionStorage.setItem('playerSessionId', sid) } catch { /* ignore */ }
          } catch (err: unknown) {
            const info = getErrorInfo(err)
            const status = info.status
            const msg = info.message
            if (status === 409 || /already online/i.test(msg) || /already exists/i.test(msg)) {
              // conflict: someone (maybe another tab) already marked this player online.
              // Non-fatal — we'll keep local marker and continue.
            } else if (status === 404 || /player not found/i.test(msg) || /session not found/i.test(msg) || /not found/i.test(msg)) {
              // server says this player/session does not exist -> force local logout and navigate home
              try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
              try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
              try { navigate('/') } catch { /* ignore */ }
              return
            } else {
              console.warn('setPlayerOnline failed, falling back to localStorage:', msg)
            }
          }
        }
      }

      // Always ensure the localStorage representation contains the player number
      // so the organiser and other tabs see the player as present immediately.
      // The server remains authoritative and WaitingRoom may later overwrite
      // based on server sync, but adding here prevents an immediate removal
      // when navigating into the minigame.
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const arr = raw ? JSON.parse(raw) as string[] : []
        const hasStored = Array.isArray(arr) && (arr.includes(storedVal) || arr.includes(padded))
        if (!hasStored) {
          // store the plain representation (same as WaitingRoom fallback) so other
          // SPA components that expect the plain form find this entry.
          const next = [...arr.filter(Boolean), storedVal]
          localStorage.setItem('onlinePlayers', JSON.stringify(next))
          try { localStorage.setItem('onlinePlayers_last_update', String(Date.now())) } catch { /* ignore */ }
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(next) })) } catch { /* ignore */ }
        }
      } catch {
        try { localStorage.setItem('onlinePlayers', JSON.stringify([storedVal])) } catch { /* ignore */ }
        try { localStorage.setItem('onlinePlayers_last_update', String(Date.now())) } catch { /* ignore */ }
      }
    } catch {
      // ignore
    }
  }, [navigate])

  // On unmount, ensure the player is marked offline
  useEffect(() => {
    return () => {
      // when leaving the minigame (component unmount), mark the player back online
      void setPlayerStatus('online');
      void markOnline();
    };
  }, [markOnline, setPlayerStatus]);

  // Keep the player alive on the server while the minigame is running so the
  // authoritative onlinePlayers list (used by organizer/waiting-room) still
  // contains this player's number. This mirrors the heartbeat logic in
  // `PlayerGame`/`WaitingRoom` but runs only while the minigame is started.
  useEffect(() => {
    if (!started) return
    const sessionStorageId = sessionStorage.getItem('playerSessionId')
    const localStorageId = localStorage.getItem('currentSessionId')
    const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
    const playerNumber = sessionStorage.getItem('playerNumber') || ''
    if (!sid || !playerNumber) return

    let cancelled = false
    const intervalMs = 5000
    const tick = () => {
      if (cancelled) return
      void import('../../api').then(m => m.postPlayerHeartbeat(sid, String(playerNumber))).catch((err: unknown) => {
        const info = getErrorInfo(err)
        const status = info.status
        const msg = info.message
        if (status === 404 || /player not found/i.test(msg) || /session not found/i.test(msg) || /not found/i.test(msg)) {
          // organizer removed this player on server; stop polling and force logout
          cancelled = true
          try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
          try { navigate('/') } catch { /* ignore */ }
        }
        // for 409 or other errors, keep trying; 409 usually means "already online" and is non-fatal
      })
    }

    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [started, navigate])

  // While the minigame is started, periodically ensure localStorage.onlinePlayers
  // contains our padded player number and update a freshness timestamp. This
  // prevents other tabs (WaitingRoom) from briefly thinking the player is gone
  // when server syncs or transient failures occur.
  useEffect(() => {
    if (!started) return
    const plain = String(sessionStorage.getItem('playerNumber') || '')
    if (!plain) return
    const padded = plain.padStart(3, '0')

    let cancelled = false
    const ensure = () => {
      if (cancelled) return
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const arr = raw ? JSON.parse(raw) as string[] : []
        const has = Array.isArray(arr) && (arr.includes(plain) || arr.includes(padded) || arr.map(x => String(x).padStart(3,'0')).includes(padded))
        if (!has) {
          const next = [...arr.filter(Boolean), padded]
          localStorage.setItem('onlinePlayers', JSON.stringify(next))
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(next) })) } catch { /* ignore */ }
        } else {
          // update a transient timestamp to signal recent activity
          try { localStorage.setItem('onlinePlayers_last_update', String(Date.now())) } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    // run immediately and then periodically
    ensure()
    const id = window.setInterval(ensure, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [started])

  // Ensure we notify backend when the user closes the tab/window.
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const playerNumber = sessionStorage.getItem('playerNumber') || ''
        const sessionStorageId = sessionStorage.getItem('playerSessionId')
        const localStorageId = localStorage.getItem('currentSessionId')
        const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
        if (sid && playerNumber) {
          try {
            // prefer sendBeacon to signal offline to the session-specific endpoint
            const url = `${(import.meta.env.VITE_API_URL || '')}/api/sessions/${encodeURIComponent(sid)}/players/${encodeURIComponent(playerNumber)}/offline`
            const payload = JSON.stringify({})
            if (navigator && typeof navigator.sendBeacon === 'function') {
              try { navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' })) } catch { /* ignore */ }
            } else {
              try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }) } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        } else {
          // fallback: update localStorage only
          try {
            const raw2 = localStorage.getItem('onlinePlayers')
            const arr2 = raw2 ? JSON.parse(raw2) as string[] : []
            const plain = String(playerNumber)
            const padded = plain.padStart(3, '0')
            const filtered = Array.isArray(arr2) ? arr2.filter(x => (String(x) !== plain && String(x) !== padded)) : []
            localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
            try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) })) } catch { /* ignore */ }
          } catch { /* ignore */ }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  // visibilitychange handling removed to avoid flipping presence while in-game

  // Init wachtwoorden bij start (wait for user to press Start)
  useEffect(() => {
    if (!started) return;
    if (passwords.length === 0) {
      // If tests provide deterministic initial passwords, use them instead of random generation
      if (initialPasswords && initialPasswords.length > 0) {
        // ensure any provided items have a fallDuration; otherwise assign one
        const withDur = initialPasswords.map((p) => {
          const base = (p as PasswordItem).baseFallDuration ?? (p as PasswordItem).fallDuration ?? (Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7);
          const final = base * fallMultiplier;
          return { ...p, baseFallDuration: base, fallDuration: final } as PasswordItem;
        });
        setPasswords(withDur.slice())
        // store original pool as well
        originalPoolRef.current = withDur.slice()
        return
      }
      // For 8-10: choose 15 random weak passwords from the larger pool of 45
      let chosenWeakPool: string[];
      switch (effectiveAgeGroup) {
        case '8-10': {
          const pool = passwordSets['8-10'].weak.slice();
          const shuffledPool = shuffle(pool);
          chosenWeakPool = shuffledPool.slice(0, 15);
          break;
        }
        case '11-13': {
          const pool = passwordSets['11-13'].weak.slice();
          const shuffledPool = shuffle(pool);
          chosenWeakPool = shuffledPool.slice(0, 25);
          break;
        }
        case '14-16': {
          const pool = passwordSets['14-16'].weak.slice();
          const shuffledPool = shuffle(pool);
          chosenWeakPool = shuffledPool.slice(0, 30);
          break;
        }
        default: {
          chosenWeakPool = passwordSets['8-10'].weak.slice();
        }
      }

      const weak = chosenWeakPool.map((pw) => {
        const base = Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7;
        return ({ value: pw, isWeak: true, zapped: false, missed: false, baseFallDuration: base, fallDuration: base * fallMultiplier } as PasswordItem);
      });
      let strong: PasswordItem[];
      // Choose a random subset of the strong pool depending on ageGroup
      switch (effectiveAgeGroup) {
        case '8-10': {
          const pool = passwordSets['8-10'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(15, pool.length));
          strong = chosen.map((pw) => {
            const base = Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7;
            return ({ value: pw, isWeak: false, zapped: false, missed: false, baseFallDuration: base, fallDuration: base * fallMultiplier } as PasswordItem);
          });
          break;
        }
        case '11-13': {
          const pool = passwordSets['11-13'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(25, pool.length));
          strong = chosen.map((pw) => {
            const base = Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7;
            return ({ value: pw, isWeak: false, zapped: false, missed: false, baseFallDuration: base, fallDuration: base * fallMultiplier } as PasswordItem);
          });
          break;
        }
        case '14-16': {
          const pool = passwordSets['14-16'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(30, pool.length));
          strong = chosen.map((pw) => {
            const base = Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7;
            return ({ value: pw, isWeak: false, zapped: false, missed: false, baseFallDuration: base, fallDuration: base * fallMultiplier } as PasswordItem);
          });
          break;
        }
        default: {
          strong = [];
        }
      }
      const all = shuffle([...weak, ...strong]);
      setPasswords(all);
      // store original pool for endless spawning (use the pool we actually started with)
      originalPoolRef.current = all.slice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAgeGroup, started]);

  // When passwords are loaded, initialize lanes with as many items as lanes currently support
  useEffect(() => {
    if (passwords.length === 0) return;
    // if lanes already filled or nextToLoad advanced, don't re-init
    if (nextToLoad !== 0 || lanesRef.current.some((l) => l !== null)) return;
    const laneCount = lanesRef.current.length || 3;
    const initial: Array<number | null> = new Array(laneCount).fill(null);
    let idx = 0;
    for (let i = 0; i < laneCount && idx < passwords.length; i++) {
      initial[i] = idx;
      idx++;
    }
    setLanes(initial);
    setNextToLoad(idx);
  }, [passwords, nextToLoad]);

  // keep refs in sync with state
  useEffect(() => { passwordsRef.current = passwords; }, [passwords]);
  useEffect(() => { nextToLoadRef.current = nextToLoad; }, [nextToLoad]);

  // Reflect current fall duration into CSS variable so animation speed changes
  useEffect(() => {
    try {
      const container = document.querySelector('.pz-game') as HTMLElement | null;
      if (container) container.style.setProperty('--pz-fall-duration', `${fallDuration}s`);
    } catch { /* ignore */ }
  }, [fallDuration]);

  // Track consecutive correct weak zaps to increase speed, and mistakes to reset
  const correctStreakRef = React.useRef(0);
  const mistakeCountRef = React.useRef(0);

  // When zappedWeak increases, update speed rules
  useEffect(() => {
    const age = effectiveAgeGroup;
    // thresholds by age group
    // 8-10: no speed changes
    // 11-13: at 5 correct -> small speed up; reset after 2 mistakes
    // 14-16: at 5 correct -> speed up (level1); at 10 correct -> speed up again (level2); reset after 2 mistakes
    if (age === '8-10') return;

    // increment streak
    if (zappedWeak > 0) {
      // compute streak by difference of correctStreakRef and zappedWeak isn't reliable after reload; instead we update on each change
    }
    // This effect runs whenever zappedWeak or zappedStrong/missedWeak change and recomputes speed level.
    const mistakes = zappedStrong + missedWeak;
    if (mistakes >= 2) {
      // reset to base multiplier and speed level
      if (speedLevel !== 0) {
        setSpeedLevel(0);
      }
      // smoothly tween back to normal speed
      try { tweenFallMultiplier(1, 600); } catch { /* ignore */ }
      // reset counters
      correctStreakRef.current = 0;
      mistakeCountRef.current = mistakes;
      return;
    }

    // determine new speed level based on zappedWeak count and age
    if (age === '11-13') {
      if (zappedWeak >= 5 && speedLevel < 1) {
        setSpeedLevel(1);
        const mult = 0.88; // ~12% faster
        try { tweenFallMultiplier(mult, 600); } catch { /* ignore */ }
      }
    } else if (age === '14-16') {
      if (zappedWeak >= 5 && speedLevel < 1) {
        setSpeedLevel(1);
        const mult = 0.9; // small speed up
        try { tweenFallMultiplier(mult, 600); } catch { /* ignore */ }
      }
      if (zappedWeak >= 10 && speedLevel < 2) {
        setSpeedLevel(2);
        const mult = 0.75; // further speed up
        try { tweenFallMultiplier(mult, 600); } catch { /* ignore */ }
      }
    }
  }, [zappedWeak, zappedStrong, missedWeak, effectiveAgeGroup, baseFallDuration, speedLevel, applyFallMultiplierToAll, tweenFallMultiplier]);

  // helper: assign next available password index into a specific lane (atomic-ish)
  const assignNextToLane = (laneIndex: number) => {
    const curNext = nextToLoadRef.current;
    // if there is an existing password at curNext, assign it
    if (curNext < passwordsRef.current.length) {
      setLanes((prev) => {
        const copy = [...prev];
        // if laneIndex exceeds current lane length (shouldn't happen), clamp it
        const idxToSet = Math.min(laneIndex, copy.length - 1);
        copy[idxToSet] = curNext;
        return copy;
      });
      nextToLoadRef.current = curNext + 1;
      setNextToLoad(curNext + 1);
      return;
    }
    // otherwise spawn from original pool if endless
    if (endless && originalPoolRef.current) {
      const pool = originalPoolRef.current;
      const item = pool[curNext % pool.length];
      // append the new item and assign lane inside the updater
      setPasswords((prev) => {
        const newIdx = prev.length;
        // ensure appended item has baseFallDuration and computed fallDuration
        const base = (item as PasswordItem).baseFallDuration ?? (item as PasswordItem).fallDuration ?? (Math.random() * (baseFallDuration * 1.3 - baseFallDuration * 0.7) + baseFallDuration * 0.7);
        const newItem = { ...item, zapped: false, missed: false, baseFallDuration: base, fallDuration: base * fallMultiplier } as PasswordItem;
        const newList = prev.concat([newItem]);
        // assign lane to new index
        setLanes((old) => {
          const copy = [...old];
          const idxToSet = Math.min(laneIndex, copy.length - 1);
          copy[idxToSet] = newIdx;
          return copy;
        });
        return newList;
      });
      nextToLoadRef.current = curNext + 1;
      setNextToLoad(curNext + 1);
      return;
    }
    // nothing to assign
    setLanes((prev) => {
      const copy = [...prev];
      copy[laneIndex] = null;
      return copy;
    });
  };

  // apply the current fallMultiplier to all existing passwords
  

  // when processed reaches total, end the game
  useEffect(() => {
    // End when we've processed MAX_PROGRESS items even in endless mode
    if (processed >= MAX_PROGRESS) {
      setGameOver(true);
      setShowEnd(true);
      // player finished the game -> mark them back online (return to lobby)
      setPlayerStatus('online');
      void markOnline();
      return;
    }
    if (!endless) {
      if (passwords.length > 0 && processed >= passwords.length) {
        setGameOver(true);
        setShowEnd(true);
        setPlayerStatus('online');
        void markOnline();
      }
    }
  }, [processed, passwords.length, endless, markOnline, setPlayerStatus, MAX_PROGRESS]);

  // When gameOver/showEnd becomes true, compute and persist high score
  useEffect(() => {
    if (!showEnd) return;
    try {
      const key = `pz_highscore_passwordzapper_${effectiveAgeGroup}`;
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw !== null ? parseInt(existingRaw, 10) : undefined;
      const existingIsValid = typeof existing === 'number' && !Number.isNaN(existing);
      if (!existingIsValid || score > (existing as number)) {
        try { localStorage.setItem(key, String(score)); } catch { /* ignore */ }
        setHighScore(score);
        setIsNewHigh(true);
      } else {
        setIsNewHigh(false);
      }
    } catch { /* ignore */ }
  }, [showEnd, score, effectiveAgeGroup]);

  // Fireworks canvas: initialize when end screen is shown
  React.useEffect(() => {
    if (!showEnd) return;
    const canvasEl = fwCanvasRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    let canvasWidth = 0;
    let canvasHeight = 0;
    function resize() {
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.max(1, Math.floor(rect.width * dpr));
      canvasEl.height = Math.max(1, Math.floor(rect.height * dpr));
      canvasEl.style.width = `${Math.floor(rect.width)}px`;
      canvasEl.style.height = `${Math.floor(rect.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvasWidth = canvasEl.width;
      canvasHeight = canvasEl.height;
    }

    const PALETTES: string[][] = [
      ['#FFD700','#FFA500'],['#FF3333','#FF7777'],['#AA33FF','#DD88FF'],['#33DDFF','#0099FF'],
      ['#33FF88','#00CC55'],['#FF44AA','#FF0077'],['#FF3333','#AA33FF'],['#FFD700','#33DDFF']
    ];
    const rnd = (a:number,b:number) => a + Math.random() * (b - a);
    const pick = <T,>(arr:T[]) => arr[Math.floor(Math.random() * arr.length)];

    type TrailPoint = { x:number; y:number };

    class Particle {
      x:number; y:number; vx:number; vy:number; col:string; alpha:number; decay:number; r:number; tx:TrailPoint[]; doTrail:boolean;
      constructor(x:number,y:number,pal:string[],big:boolean){
        this.x = x; this.y = y;
        const a = Math.random() * Math.PI * 2;
        const s = big ? rnd(1.5,6) : rnd(0.5,2.5);
        this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
        this.col = pick(pal) as unknown as string;
        this.alpha = 1; this.decay = rnd(0.008,0.018);
        this.r = big ? rnd(1.5,3) : rnd(0.6,1.5);
        this.tx = []; this.doTrail = Math.random() < 0.45;
      }
      step(){
        if (this.doTrail) { this.tx.push({ x: this.x, y: this.y }); if (this.tx.length > 7) this.tx.shift(); }
        this.vy += 0.055; this.vx *= 0.99; this.x += this.vx; this.y += this.vy; this.alpha -= this.decay;
      }
      draw(){
        if (this.alpha <= 0) return;
        if (this.doTrail) {
          for (let i = 0; i < this.tx.length; i++) {
            const t = this.tx[i]; ctx.save(); ctx.globalAlpha = Math.max(0, (i / this.tx.length) * this.alpha * 0.35);
            ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(t.x, t.y, this.r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      dead(){ return this.alpha <= 0; }
    }

    class Burst {
      x:number; y:number; pal:string[]; col:string; phase:number; alpha:number; maxR:number; arms:number; pts:{len:number; max:number}[]; particles:Particle[];
      constructor(x:number,y:number,pal:string[]){
        this.x = x; this.y = y; this.pal = pal; this.col = pal[0]; this.phase = 0; this.alpha = 1;
        this.maxR = rnd(20,38); this.arms = 8; this.pts = [];
        for (let i = 0; i < this.arms; i++) this.pts.push({ len: 0, max: this.maxR * (i % 2 === 0 ? 1 : 0.6) });
        this.particles = [];
        for (let i = 0; i < 90; i++) this.particles.push(new Particle(x,y,pal,true));
        for (let i = 0; i < 35; i++) this.particles.push(new Particle(x,y,pal,false));
      }
      step(){ this.phase += 0.04; this.alpha = Math.max(0, 1 - this.phase * 0.55); for (const p of this.pts) p.len = Math.min(p.max, p.len + 2.8); for (const p of this.particles) p.step(); this.particles = this.particles.filter(p => !p.dead()); }
      draw(){ for (const p of this.particles) p.draw(); if (this.alpha > 0.05) { ctx.save(); ctx.globalAlpha = this.alpha; ctx.strokeStyle = this.col; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < this.arms; i++) { const a = (i / this.arms) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a) * this.pts[i].len, this.y + Math.sin(a) * this.pts[i].len); ctx.stroke(); } ctx.restore(); } }
      done(){ return this.alpha <= 0 && this.particles.length === 0; }
    }

    class Rocket {
      pal:string[]; col:string; x:number; y:number; tx:number; ty:number; vx:number; vy:number; trail:{x:number;y:number;a:number}[]; dist:number; gone:boolean; traveled:number;
      constructor(){ const pal = pick(PALETTES) as string[]; this.pal = pal; this.col = pal[0]; this.x = rnd(canvasWidth * 0.1, canvasWidth * 0.9); this.y = canvasHeight; this.tx = this.x + rnd(-60,60); this.ty = rnd(canvasHeight * 0.08, canvasHeight * 0.45); const ang = Math.atan2(this.ty - this.y, this.tx - this.x); const sp = rnd(9,15); this.vx = Math.cos(ang) * sp; this.vy = Math.sin(ang) * sp; this.trail = []; this.dist = Math.hypot(this.tx - this.x, this.ty - this.y); this.gone = false; this.traveled = 0; }
      step(){ this.trail.push({ x: this.x, y: this.y, a: 1 }); if (this.trail.length > 14) this.trail.shift(); for (const t of this.trail) t.a = Math.max(0, t.a - 0.08); this.vy += 0.03; this.x += this.vx; this.y += this.vy; this.traveled += Math.hypot(this.vx, this.vy); if (this.traveled >= this.dist * 0.9 || this.y <= this.ty) this.gone = true; }
      draw(){ for (const t of this.trail) { if (t.a <= 0) continue; ctx.save(); ctx.globalAlpha = t.a * 0.7; ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } if (!this.gone) { ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    }

    const rockets: Rocket[] = [];
    const bursts: Burst[] = [];
    let last = 0;
    let interval = 600;
    let raf = 0;

    function loop(ts:number){
      raf = requestAnimationFrame(loop);
      // fade towards white background
      ctx.fillStyle = 'rgba(255,255,255,0.17)';
      ctx.fillRect(0,0,canvasWidth,canvasHeight);

      if (ts - last > interval) {
        last = ts; interval = rnd(400,800); rockets.push(new Rocket()); if (Math.random() < 0.55) setTimeout(() => rockets.push(new Rocket()), rnd(80,180)); if (Math.random() < 0.25) setTimeout(() => rockets.push(new Rocket()), rnd(200,350));
      }

      for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.step(); r.draw(); if (r.gone) { bursts.push(new Burst(r.x, r.y, r.pal)); rockets.splice(i,1); } }
      for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.step(); b.draw(); if (b.done()) bursts.splice(i,1); }
    }

    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [showEnd]);

  // Unlock and show hint when mistakes reach the threshold for the age group.
  // Ensure we only auto-open the hint modal once when the threshold is first reached.
  const hintAutoShownRef = React.useRef(false);
  useEffect(() => {
    const mistakes = zappedStrong + missedWeak;
    const hintThreshold = effectiveAgeGroup === '8-10' ? 1 : effectiveAgeGroup === '11-13' ? 2 : 3;
    if (mistakes >= hintThreshold && !hintAutoShownRef.current) {
      // mark we've auto-shown the hint so we don't do it again
      hintAutoShownRef.current = true;
      try {
        setShowHint(true);
        setPaused(true);
      } catch { /* ignore */ }
      // set a transient global flag and notify other UI (MinigamePage) so its external hint button can be enabled
      try {
        if (typeof window !== 'undefined') {
          const w = window as unknown as Record<string, unknown>;
          w['__pz_hint_unlocked'] = true;
          window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'));
        }
      } catch { /* ignore */ }
    }
  }, [zappedStrong, missedWeak, effectiveAgeGroup]);

  // removed legacy zap/next/skip functions; use zapAt/skipAt which operate per-index/lane

  // Process zap for a specific index (when clicking a specific comet)
  const zapAt = (idx: number) => {
    if (gameOver) return;
    if (paused) return;
    const pw = passwords[idx];
    if (!pw) return;
    if (pw.zapped || pw.missed) return;
    if (pw.isWeak) {
      // Weak password zapped => +2 points
      // progress increases only for weak passwords
      setProcessed((n) => n + 1);
      setScore((s) => Math.max(0, s + 2));
      setZappedWeak((n) => n + 1);
      setFeedback(randomFrom(goodFeedbackList));
      setFeedbackType('good');
    } else {
      // Strong password zapped => -1 point
      setScore((s) => Math.max(0, s - 1));
      setZappedStrong((n) => n + 1);
      setFeedback(randomFrom(badFeedbackList));
      setFeedbackType('bad');
    }
    // mark password as zapped to prevent duplicate interactions
    updatePassword(idx, true, false);
    // show visual feedback by swapping the comet image to Correct/Wrong
    setImgOverrides((prev) => ({ ...prev, [idx]: pw.isWeak ? correctSrc : wrongSrc }));
    // remove from its lane after a short delay so the user sees the image change
    const laneIndex = lanes.findIndex((v) => v === idx);
    if (laneIndex >= 0) {
      setTimeout(() => {
        setLanes((prev) => {
          const copy = [...prev];
          copy[laneIndex] = null;
          return copy;
        });
        assignNextToLane(laneIndex);
        // clear the temporary override
        setImgOverrides((prev) => {
          const copy = { ...prev };
          delete copy[idx];
          try { shotFiredRef.current.delete(idx); } catch { /* ignore */ }
          return copy;
        });
      }, 600);
    }
    setTimeout(() => {
      setFeedback(null);
      setFeedbackType(null);
      try { shotFiredRef.current.delete(idx); } catch { /* ignore */ }
    }, 1200);
  };

  // Shoot a laser from the ship position to the comet at index idx.
  // The laser is animated in the DOM; when it reaches the target we trigger an explosion and handle zap logic.
  const laserIdRef = React.useRef(1);
  const shootLaserTo = (idx: number) => {
    if (gameOver) return;
    if (paused) return;
    const pw = passwords[idx];
    if (!pw) return;
    if (pw.zapped || pw.missed) return;
    // compute positions relative to asteroid container
    const container = asteroidRef.current;
    if (!container) {
      // fallback to direct zap if we cannot compute positions
      return zapAt(idx);
    }
    const shipImg = document.querySelector('.pz-ship') as HTMLImageElement | null;
    const cometImg = container.querySelector(`img[data-idx='${idx}']`) as HTMLImageElement | null;
    if (!shipImg || !cometImg) {
      return zapAt(idx);
    }
    const cRect = container.getBoundingClientRect();
    const shipRect = shipImg.getBoundingClientRect();
    const cometRect = cometImg.getBoundingClientRect();

    // start point (center of ship)
    const startX = shipRect.left + shipRect.width / 2 - cRect.left;
    const startY = shipRect.top + shipRect.height / 2 - cRect.top;
    // target point (center of comet)
    const targetX = cometRect.left + cometRect.width / 2 - cRect.left;
    const targetY = cometRect.top + cometRect.height / 2 - cRect.top;

    const angle = Math.atan2(targetY - startY, targetX - startX);
    const id = laserIdRef.current++;
    // center the laser image on the ship start point
    const leftPos = startX - (LASER_SIZE / 2);
    const topPos = startY - (LASER_SIZE / 2);
    // prevent multiple lasers for the same comet
    if (shotFiredRef.current.has(idx)) return;
    // mark shot fired for this index
    shotFiredRef.current.add(idx);
    // add laser to state with zero translation so we can animate to target
    setLasers((prev) => prev.concat([{ id, left: leftPos, top: topPos, translateX: 0, translateY: 0, angle, targetIdx: idx, anim: false }]));

    // trigger the CSS transition on next tick
    window.setTimeout(() => {
      setLasers((prev) => prev.map(l => l.id === id ? { ...l, translateX: targetX - startX, translateY: targetY - startY, anim: true } : l));
    }, 20);

    // after animation duration (~340ms), trigger hit
    const travelMs = 340;
    window.setTimeout(() => {
      // trigger zap logic (this will set imgOverrides and score, etc.)
      zapAt(idx);
      // remove laser
      setLasers((list) => list.filter(l => l.id !== id));
    }, travelMs);
  };

  // Skip (miss) for a specific index (e.g., when animation ends)
  const skipAt = (idx: number) => {
    if (gameOver) return;
    if (paused) return;
    const pw = passwords[idx];
    if (!pw) return;
    if (pw.zapped || pw.missed) return;
    if (pw.isWeak) {
      // progress increases only for weak passwords
      setProcessed((n) => n + 1);
      // Weak password missed (skipped) => -1 point
      setScore((s) => Math.max(0, s - 1));
      setMissedWeak((n) => n + 1);
      setFeedback(randomFrom(badFeedbackList));
      setFeedbackType('bad');
    } else {
      // Strong password missed (allowed to pass) => +0 points (no score change)
      setFeedback(randomFrom(goodFeedbackList));
      setFeedbackType('good');
    }
    updatePassword(idx, false, true);
    const laneIndex2 = lanes.findIndex((v) => v === idx);
    if (laneIndex2 >= 0) {
      setLanes((prev) => {
        const copy = [...prev];
        const idxToClear = Math.min(laneIndex2, copy.length - 1);
        copy[idxToClear] = null;
        return copy;
      });
      assignNextToLane(laneIndex2);
      try { shotFiredRef.current.delete(idx); } catch { /* ignore */ }
    }
    setTimeout(() => {
      setFeedback(null);
      setFeedbackType(null);
      try { shotFiredRef.current.delete(idx); } catch { /* ignore */ }
    }, 1200);
  };

  // legacy skip removed - use skipAt(index) for per-lane misses

  // Update wachtwoordstatus
  const updatePassword = (idx: number, zapped: boolean, missed: boolean) => {
    setPasswords((pwds) =>
      pwds.map((pw, i) =>
        i === idx ? { ...pw, zapped, missed } : pw
      )
    );
  };

  // Called when the falling animation finishes for a specific index
  const handleFallEnd = (idx?: number) => {
    if (typeof idx !== 'number') return;
    const pw = passwords[idx];
    if (!pw) return;
    if (pw.zapped || pw.missed) return;
    if (paused) return; // don't auto-skip while paused
    // treat as missed
    skipAt(idx);
  };

  // Helper to restart the game without reloading the page
  const resetGame = () => {
    // reset all relevant state to initial values and re-initialize passwords
    setScore(0);
    setFeedback(null);
    setFeedbackType(null);
    setProcessed(0);
    setGameOver(false);
    setShowEnd(false);
    setZappedWeak(0);
    setMissedWeak(0);
    setZappedStrong(0);
    setImgOverrides({});
    setLasers([]);
    setLanes(new Array(MAX_LANES).fill(null));
    setNextToLoad(0);
    nextToLoadRef.current = 0;
    passwordsRef.current = [];
    originalPoolRef.current = null;
    setPasswords([]);
    setStarted(false);
    setIsNewHigh(false);
    // reopen start modal; the user can press start again
  };

  // Eindscherm
  if (showEnd) {
    // determine how many weak passwords were actually in this game run
    const actualWeakInGame = (() => {
      try {
        const fromPasswords = passwords.filter((p) => p.isWeak).length;
        if (fromPasswords > 0) return fromPasswords;
      } catch { /* ignore */ }
      // fallback to expected counts per age group when passwords not available
      return effectiveAgeGroup === '8-10' ? 15 : effectiveAgeGroup === '11-13' ? 25 : 30;
    })();

    const totalCorrect = zappedWeak; // number of weak passwords correctly zapped
    const totalWrong = zappedStrong + missedWeak;
    const correctPercentage = actualWeakInGame > 0 ? Math.round((totalCorrect / actualWeakInGame) * 100) : 0;
    // thresholds updated per request: 0-33% => 1 star, 34-66% => 2 stars, 67-100% => 3 stars
    const starCount = correctPercentage <= 33 ? 1 : (correctPercentage <= 66 ? 2 : 3);

    // compute score percentage based on max possible score per age group
    const maxPossibleScore = effectiveAgeGroup === '14-16' ? 60 : effectiveAgeGroup === '11-13' ? 50 : 30;
    const scorePercent = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
    const clampedScorePercent = Math.max(0, Math.min(100, scorePercent));
    // prepare CSS variable style (typed) for the ring fill
    const circleStyle = ({ ['--pz-score-pct' as unknown as string]: `${clampedScorePercent}%` } as unknown) as React.CSSProperties;

    return (
      <div className="pz-end">
        <div className="pz-end-box">
          {/* fireworks canvas (renders behind the end content) */}
          <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
          <div className="pz-highscore" style={{ marginBottom: 18, textAlign: 'center' }}>
            <span className="pz-highscore-label">Hoogste score:</span>
            <span id="highScore" className="pz-highscore-value">{highScore ?? '-'}</span>
            {isNewHigh && <span className="pz-new-record"> Nieuw record!</span>}
          </div>
          {/* fireworks removed */}

          <div className="pz-end-content">
            <div className="pz-end-left">
              <div className="pz-score-circle" aria-hidden style={circleStyle}>
                <div className="pz-score-label">SCORE</div>
                <div className="pz-score-number" id="score">{score}</div>
                <div className="pz-score-percent" id="percentage">{clampedScorePercent}%</div>
                <div className="pz-score-stars" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={"pz-star " + (i < starCount ? '' : 'pz-star--empty')}>
                      {i < starCount ? '★' : '☆'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pz-stats-row">
                <div className="pz-stat pz-stat--correct">
                  <div className="pz-stat-title">Juist</div>
                  <div className="pz-stat-value" id="totalCorrect">+{totalCorrect}</div>
                </div>
                <div className="pz-stat pz-stat--wrong">
                  <div className="pz-stat-title">Fout</div>
                  <div className="pz-stat-value" id="totalWrong">-{totalWrong}</div>
                </div>
              </div>
            </div>

            <div className="pz-end-right">
              <div className="pz-tips-card">
                <h3>Tips voor sterke wachtwoorden</h3>
                <ul>
                  <li>Gebruik minstens 2 woorden die niets met elkaar te maken hebben, bv. HondWolken4.</li>
                  <li>Voeg een cijfer en een teken toe zoals ! of @.</li>
                  <li>Gebruik nooit je naam, verjaardag of alleen cijfers "123456".</li>
                </ul>

                <div className="pz-end-actions">
                  <button id="btnPlayAgain" className="pz-play-again" onClick={() => { resetGame(); }}>Opnieuw spelen</button>
                </div>
              </div>
            </div>
          </div>

          {/* footer removed - highscore now displayed above the attributes */}
        </div>
      </div>
    );
  }

  // Start modal: show rules before the game begins
  const handleStart = async () => {
    // When entering the minigame, keep the player ONLINE so the organizer/waiting-room
    // still shows them as present. Previously we marked them offline here; change
    // that so players remain visible while playing.
    try {
      await markOnline();
      setPlayerStatus('online');
    } catch {
      // ignore errors; best-effort presence update
    }
    // Ensure the URL reflects the selected age group so links/bookmarks show the correct category
    try {
      const params = new URLSearchParams(window.location.search || '');
      // set or replace age param to the effectiveAgeGroup
      params.set('age', String(effectiveAgeGroup));
      // ensure game param is present (keep existing or set to passwordzapper)
      if (!params.get('game')) params.set('game', 'passwordzapper');
      // replace current history entry so back-button isn't polluted
      const newSearch = params.toString();
      try { navigate(`${window.location.pathname}?${newSearch}`, { replace: true }); } catch { /* ignore */ }
    } catch { /* ignore */ }
    setStarted(true);
  }

  // Pause controls are implemented inline in the pause modal to avoid unused-variable warnings

  if (!started) {
    return (
      <div className="pz-game">
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - Password zapper</h2>
            <ul className="pz-start-bullets">
              <li>Je ziet een ruimteschip op het scherm — dat ben jij!</li>
              <li>Kometen met wachtwoorden vliegen voorbij. Sommige hebben een zwak wachtwoord (bv. {examples.weak}) en sommige hebben een sterk wachtwoord (bv. {examples.strong}) erop.</li>
              <li>Tik op de komeet en schiet de zwakke wachtwoorden.</li>
              <li>Laat de sterke wachtwoorden voorbijvliegen — niet schieten!</li>
            </ul>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                      <button className="pz-start-btn pz-start-btn--large" onClick={() => void handleStart()}>Volgende</button>
                  </div>
              </div>
          </div>
        </div>
      </div>
    );
  }

  // Help modal (triggered by question mark) - shows rules but NO action button
  if (showHelp) {
    return (
      <div className="pz-game">
        <div className="pz-start-overlay" onClick={() => setShowHelp(false)}>
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'left' }}>Speluitleg - Password zapper</h2>
            <ul className="pz-start-bullets">
              <li>Je ziet een ruimteschip op het scherm — dat ben jij!</li>
              <li>Kometen met wachtwoorden vliegen voorbij. Sommige hebben een zwak wachtwoord (bv. {examples.weak}) en sommige hebben een sterk wachtwoord (bv. {examples.strong}) erop.</li>
              <li>Tik op de komeet en schiet de zwakke wachtwoorden.</li>
              <li>Laat de sterke wachtwoorden voorbijvliegen — niet schieten!</li>
            </ul>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => setShowHelp(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Hint modal overlay (triggered by hint button)
  if (showHint) {
    return (
      <div className="pz-game">
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2 style={{ textAlign: 'left' }}>Hint</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              {/* Age-group specific hints as list items so the yellow bullet appears */}
              {effectiveAgeGroup === '8-10' && (
                <ul className="pz-start-bullets pz-hint-bullets">
                  <li className="pz-hint-item">
                    Zap wachtwoorden zoals kat, 123456 of minecraft — die zijn te makkelijk! </li>
                    <li className="pz-hint-item">
                        Een sterk wachtwoord ziet er zo uit: Boom@Vis7 — Twee losse woorden, een teken en een cijfer!
                    </li>
                </ul>
              )}
              {effectiveAgeGroup === '11-13' && (
                <ul className="pz-start-bullets pz-hint-bullets">
                  <li className="pz-hint-item">
                    Let op! Wachtwoorden zoals samsung123 of Voetbal!1 zijn te voorspelbaar — ook al hebben ze een symbool. </li>
                    <li className="pz-hint-item">
                        Een sterk wachtwoord ziet er zo uit: Tijger#Soep8 — twee willekeurige woorden die niets met elkaar te maken hebben + symbool + cijfer
                    </li>
                </ul>
              )}
              {effectiveAgeGroup === '14-16' && (
                <ul className="pz-start-bullets pz-hint-bullets">
                  <li className="pz-hint-item">
                    Wachtwoorden zoals Admin?2024 of Welkom!99 lijken sterk, maar zijn de eerste gok van hackers.
                      </li>
                    <li className="pz-hint-item">
                        Een sterk wachtwoord ziet er zo uit: TijgerEten?99 — twee willekeurige woorden die niets met elkaar te maken hebben + symbool + cijfers
                    </li>
                </ul>
              )}
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false); }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Pause modal overlay
  if (paused) {
    return (
      <div className="pz-game">
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => { setPaused(false); }}>Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={() => { try { window.location.reload() } catch { /* ignore */ } }}>Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => {
                setPaused(false); setGameOver(true); setShowEnd(true); try { setPlayerStatus('online'); } catch { /* ignore */ } void markOnline();
              }}>Stoppen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Huidig wachtwoord logic removed (we use lanes)
  // Progress should reflect how far through the password list the player is,
  // not the score. Use currentIdx (0-based) -> show (currentIdx+1)/passwords.length.
  // Cap progressbar to at most 30 steps so the UI doesn't grow beyond that
  const displayedProcessed = Math.min(processed, MAX_PROGRESS);
  const fillPercent = Math.max(
    0,
    Math.min(100, Math.round((displayedProcessed / MAX_PROGRESS) * 100))
  );

  return (
    <div className="pz-game">
      {/* debug badge removed */}
      <div className="pz-score">Score: {score}</div>
      {/* Local status badge so player understands presence behavior */}
      <div className="pz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fillPercent}>
        <div className="pz-progress-fill" style={{ width: `${fillPercent}%` }} />
        <div className="pz-progress-text">{displayedProcessed} / {MAX_PROGRESS}</div>
      </div>
      {feedback && (
        <div
          id="feedback"
          className={"pz-feedback " + (feedbackType === 'good' ? 'pz-feedback--good' : feedbackType === 'bad' ? 'pz-feedback--bad' : '')}
          role="status"
          aria-live="polite"
        >
          {feedback}
        </div>
      )}
      {/* add a modifier class so CSS can adapt positions for 3 vs 4 lanes */}
      <div className={`pz-asteroid ${lanes.length === 3 ? 'pz-lanes-3' : 'pz-lanes-4'}`} ref={asteroidRef}>
        {lanes.map((idx, lane) => {
          if (idx === null || idx === undefined) return null;
          const item = passwords[idx];
          if (!item) return null;
          // map lane index to CSS class; support up to 4 lanes (left, inner-left, center, right)
          const laneClass = lane === 0 ? 'pz-lane-left' : lane === 1 ? (lanes.length === 4 ? 'pz-lane-inner-left' : 'pz-lane-center') : lane === 2 ? (lanes.length === 4 ? 'pz-lane-center' : 'pz-lane-right') : 'pz-lane-right';
          const isWeakComet = item.isWeak;

          // use item's fallDuration if present; otherwise fall back to CSS variable
          const itemDurationStyle = item.fallDuration ? { animationDuration: `${item.fallDuration}s` } : undefined;
          return (
            <div key={idx} className={`pz-password pz-password--fall ${laneClass}`} onAnimationEnd={() => handleFallEnd(idx)} style={itemDurationStyle}>
                  <img
                      id={`komeet-${idx}`}
                      src={imgOverrides[idx] ?? komeetSrc}
                        alt={`Komeet voor wachtwoord`}
                        className={`pz-comet ${imgOverrides[idx] ? 'pz-comet--static' : ''} ${isWeakComet ? 'pz-comet--weak' : 'pz-comet--strong'}`}
                        role="button"
                        tabIndex={0}
                        data-idx={idx}
                        onClick={() => shootLaserTo(idx)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shootLaserTo(idx); } }}
                // rotation speed is set via lane CSS variables
              />
              <span className={`pz-password-label ${imgOverrides[idx] ? 'pz-password-label--hidden' : ''}`} aria-hidden={!!imgOverrides[idx]}>{item.value}</span>
            </div>
          );
        })}
        {/* render lasers (absolutely positioned inside asteroid) */}
        {lasers.map((l) => (
          <img
            key={l.id}
            src={laserSrc}
            alt="laser"
            aria-hidden="true"
            className="pz-laser"
            style={{ left: l.left, top: l.top, transform: `translate(${l.translateX}px, ${l.translateY}px) rotate(${l.angle}rad) rotate(${-Math.PI/2}rad) rotate(${Math.PI}rad)` }}
          />
        ))}
        {/* explosions removed */}
      </div>
      {/* ruimteschip onderaan in het midden */}
      <img src={shipSrc} alt="Ruimteschip" className="pz-ship" />
    </div>
  );
};

export default PasswordZapperGame;

