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
      "123456","password","1234","0000","1111","abcd","qwerty","letmein","iloveyou","monkey",
      "dragon","sunshine","football","baseball","princess","welcome","shadow","superman","pokemon","starwars",
      "batman","1q2w3e","123123","abc123","password1","12345","654321","555555","hunter","george",
      "asdfgh","qazwsx","flower","cookie","soccer","hockey","cheese","987654","pass","iloveu",
      "lovely","kitty","pookie","bingo","naruto"
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
      "qwerty123","password1","voetbal22","admin123","letmein","iloveyou1","monkey123","dragon99","master2024","abc12345",
      "thomas2012","sophie2013","samsung123","google123","12345678","11111111","qwertyui","azerty123","zxcvbnm","pokemon25",
      "minecraft1","roblox2023","liverpool9","barcelona10","batman123","superman1","nederland1","welkom123","zomer2024","winter2023",
      "school123","thuis2024","hallo1234","test1234","user1234","secure1","pass1234","login123","corona2020","vakantie1",
      "geheim123","thomas!!","Wachtwoord1","Password!1","Voetbal!1","Admin!23","Zomer!24","School!1","Hallo!23","Test@123",
      "User@2024","Login@1","Sophie@13","Thomas@12","Dragon@99","Batman@1","Pokemon@25","Roblox@23","Minecraft@1","Welkom@123"
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
}

interface Props {
  ageGroup: "8-10" | "11-13" | "14-16";
}

const PasswordZapperGame: React.FC<Props> = ({ ageGroup }) => {
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
  // explosions removed - we no longer render explosion overlays
  // ref to asteroid container so we can compute coordinates
  const asteroidRef = React.useRef<HTMLDivElement | null>(null);
  // same size as .pz-laser in CSS (desktop default) - used to center the image
  const LASER_SIZE = 128;
  // lanes: indices of passwords currently visible in each lane (left, center, right)
  const [lanes, setLanes] = useState<Array<number | null>>([null, null, null]);
  // next password index to load into an empty lane
  const [nextToLoad, setNextToLoad] = useState(0);
  // Keep a copy of the original pool to spawn new items when exhausted
  const originalPoolRef = React.useRef<PasswordItem[] | null>(null);
  // refs to keep current snapshots for synchronous allocation when multiple lanes finish
  const passwordsRef = React.useRef<PasswordItem[]>(passwords);
  const nextToLoadRef = React.useRef<number>(nextToLoad);
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

  // Use normalizedAgeGroup as the effective age group (no UI override in start modal)
  const effectiveAgeGroup: "8-10" | "11-13" | "14-16" = normalizedAgeGroup;

  // Debug: help diagnose mismatches in runtime environments
  // debug log removed

  // Diagnostic values are rendered inline in the debug badge below (avoid unused-var lint errors)

  const MAX_PROGRESS = effectiveAgeGroup === '8-10' ? 15 : effectiveAgeGroup === '14-16' ? 30 : 25;
  // whether the player has started the game (controls the start modal)
  const [started, setStarted] = useState(false);
  const navigate = useNavigate()

  // Toggle a body-level class so other UI (hint/pause/question, score, progress, ship)
  // can be hidden via CSS while the start modal is visible.
  useEffect(() => {
    const cls = 'pz-modal-open';
    if (!started) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => { document.body.classList.remove(cls); };
  }, [started]);

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

      const weak = chosenWeakPool.map((pw) => ({ value: pw, isWeak: true, zapped: false, missed: false }));
      let strong: PasswordItem[];
      // Choose a random subset of the strong pool depending on ageGroup
      switch (effectiveAgeGroup) {
        case '8-10': {
          const pool = passwordSets['8-10'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(15, pool.length));
          strong = chosen.map((pw) => ({ value: pw, isWeak: false, zapped: false, missed: false }));
          break;
        }
        case '11-13': {
          const pool = passwordSets['11-13'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(25, pool.length));
          strong = chosen.map((pw) => ({ value: pw, isWeak: false, zapped: false, missed: false }));
          break;
        }
        case '14-16': {
          const pool = passwordSets['14-16'].strong.slice();
          const chosen = shuffle(pool).slice(0, Math.min(30, pool.length));
          strong = chosen.map((pw) => ({ value: pw, isWeak: false, zapped: false, missed: false }));
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

  // When passwords are loaded, initialize lanes with up to 3 first items
  useEffect(() => {
    if (passwords.length === 0) return;
    // if lanes already filled or nextToLoad advanced, don't re-init
    if (nextToLoad !== 0 || lanes.some((l) => l !== null)) return;
    const initial: Array<number | null> = [null, null, null];
    let idx = 0;
    for (let i = 0; i < 3 && idx < passwords.length; i++) {
      initial[i] = idx;
      idx++;
    }
    setLanes(initial);
    setNextToLoad(idx);
  }, [passwords, lanes, nextToLoad]);

  // keep refs in sync with state
  useEffect(() => { passwordsRef.current = passwords; }, [passwords]);
  useEffect(() => { nextToLoadRef.current = nextToLoad; }, [nextToLoad]);

  // helper: assign next available password index into a specific lane (atomic-ish)
  const assignNextToLane = (laneIndex: number) => {
    const curNext = nextToLoadRef.current;
    // if there is an existing password at curNext, assign it
    if (curNext < passwordsRef.current.length) {
      setLanes((prev) => {
        const copy = [...prev];
        copy[laneIndex] = curNext;
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
        const newList = prev.concat([{ ...item, zapped: false, missed: false }]);
        // assign lane to new index
        setLanes((old) => {
          const copy = [...old];
          copy[laneIndex] = newIdx;
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

  // removed legacy zap/next/skip functions; use zapAt/skipAt which operate per-index/lane

  // Process zap for a specific index (when clicking a specific comet)
  const zapAt = (idx: number) => {
    if (gameOver) return;
    const pw = passwords[idx];
    if (!pw) return;
    if (pw.zapped || pw.missed) return;
    if (pw.isWeak) {
      // Weak password zapped => +2 points
      // progress increases only for weak passwords
      setProcessed((n) => n + 1);
      setScore((s) => Math.max(0, s + 2));
      setZappedWeak((n) => n + 1);
      setFeedback(randomFrom(goodFeedbackList) + ' +2');
      setFeedbackType('good');
    } else {
      // Strong password zapped => -1 point
      setScore((s) => Math.max(0, s - 1));
      setZappedStrong((n) => n + 1);
      setFeedback(randomFrom(badFeedbackList) + ' -1');
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
          return copy;
        });
      }, 600);
    }
    setTimeout(() => {
      setFeedback(null);
      setFeedbackType(null);
    }, 1200);
  };

  // Shoot a laser from the ship position to the comet at index idx.
  // The laser is animated in the DOM; when it reaches the target we trigger an explosion and handle zap logic.
  const laserIdRef = React.useRef(1);
  const shootLaserTo = (idx: number) => {
    if (gameOver) return;
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
        copy[laneIndex2] = null;
        return copy;
      });
      assignNextToLane(laneIndex2);
    }
    setTimeout(() => {
      setFeedback(null);
      setFeedbackType(null);
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
    // treat as missed
    skipAt(idx);
  };

  // Eindscherm
  if (showEnd) {
    const totalWeak = passwordSets[effectiveAgeGroup].weak.length;
    return (
      <div className="pz-end">
        <h2>Game Over!</h2>
        <p>Score: {score}</p>
        <p>Juiste zwakke wachtwoorden gezapt: {zappedWeak} / {totalWeak}</p>
        <p>Foute acties: {zappedStrong + missedWeak}</p>
        <p>Percentage correct: {Math.round((zappedWeak / totalWeak) * 100)}%</p>
        <div className="pz-tips">
          <h4>Tips voor sterke wachtwoorden:</h4>
          <ul>
            <li>Gebruik hoofdletters, kleine letters, cijfers en symbolen</li>
            <li>Vermijd voor de hand liggende patronen</li>
            <li>Gebruik geen persoonlijke info</li>
            <li>Maak wachtwoorden lang en uniek</li>
          </ul>
        </div>
        <button onClick={() => window.location.reload()}>Opnieuw spelen</button>
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
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="pz-game">
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - Password zapper</h2>
            <ul className="pz-start-bullets">
              <li>Je ziet een ruimteschip op het scherm — dat ben jij!</li>
              <li>Kometen met wachtwoorden vliegen voorbij. Sommige hebben een zwak wachtwoord (bv. 🧾✨) en sommige hebben een sterk wachtwoord (bv. 123456) erop.</li>
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
      <div className="pz-asteroid" ref={asteroidRef}>
        {lanes.map((idx, lane) => {
          if (idx === null || idx === undefined) return null;
          const item = passwords[idx];
          if (!item) return null;
          const laneClass = lane === 0 ? 'pz-lane-left' : lane === 1 ? 'pz-lane-center' : 'pz-lane-right';
          return (
            <div key={idx} className={`pz-password pz-password--fall ${laneClass}`} onAnimationEnd={() => handleFallEnd(idx)}>
                  <img
                        src={imgOverrides[idx] ?? komeetSrc}
                        alt={`Komeet voor wachtwoord`}
                        className={`pz-comet ${imgOverrides[idx] ? 'pz-comet--static' : ''}`}
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

