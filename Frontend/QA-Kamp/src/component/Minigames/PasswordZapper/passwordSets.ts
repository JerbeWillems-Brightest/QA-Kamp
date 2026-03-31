// This module exports the password pools used by PasswordZapperGame.
// Separated into its own file so the main game bundle stays smaller and
// the large arrays are loaded only when the minigame starts.

const passwordSets = {
  "8-10": {
    weak: [
      "123456","wachtwoord","1234","0000","1111","abcd","toets","laatmebinnen","houvanjouw","aap",
      "draak","zon","voetbal","honkbal","prinses","welkom","schaduw","superman","pokemon","starwars",
      "batman","1a2b3c","123123","abc123","wachtwoord1","12345","654321","555555","jager","bob",
      "knop","links","bloem","koekje","voetbal123","spelen","kaas","987654","pas","teen",
      "liefdevol","kat","baby","bingo","vrouw"
    ],
    strong: [
      "Zon!Maan9","Hond!Kat5","Boom@Vis7","Roos#Appel3","Ster!Boot4","Wolk@Fiets6","Lamp#Slang2","Tent!Gras8",
      "Berg@Zee5","Vlam!Sneeuw3","Peer#Dak7","Maan@Brug4","Krab!Woud6","Deur#Ijs9","Rok!Wind2","Vuur@Glas5",
      "Stoel!Regen8","Bal#Mist3","Mes!Zand7","Nacht@Brood4","Kip!Steen6","Doos#Zee2","Licht!Weg9","Tuin@Klok5",
      "Spin!Goud3","Hek#Vogel8","Tak!Zout4","Mond@Bos7","Vel!Rots2","Kern#Ruit6","Poot!Wolk9","Graf@Sap3",
      "Hars!Brug5","Geit#Wind8","Roos@Ijs4","Dak!Peer2","Kool#Nacht7","Vlieg!Steen5","Zeil@Gras3","Muur!Brood9",
      "Stof#Rok6","Vos!Lamp4","Glas@Berg2","Slak!Deur8","Neus#Vuur5","Tand!Krab3","Brug@Stoel7","Kist!Zeil6",
      "Goud#Spin9","Oog!Muur4","Zand@Hek2","Riet!Licht7","Boom#Mes5","Ster@Doos3","Haas!Kern8","Tent#Oog6",
      "Wolk!Vel4","IJzer@Neus2","Duif!Stof9","Bos#Tand7","Vlam@Kist5","Steen!Riet3","Peer!Muur6","Dak@Haas8",
      "Ijs#Duif4","Brood!Berg2","Nacht@Tuin9","Sap!Geit7","Rok#Poot5","Ruit!Vos3","Wind@Slak8","Gras!Kool6",
      "Brug#Vlieg4","Kip@Zeil2","Mes!Roos9","Tak#Glas7","Vuur!Slak5","Maan@Tand3","Lamp!Goud8","Graf#Zand6",
      "Hars@Oog4","Geit!Nacht2","Spin#Berg9","Doos!Tuin7","Licht@Rok5","Weg!Kist3","Klok#Vlam8","Stoel!Sap6"
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
      "M@ngo$Regen9","Bl@uw#Fiets7","Taart!Wolken4","Citroen&Boot22","Paars!Ladder6","Vork@Sneeuw3","Regen#Tafel8","Ijsbeer!Lamp5",
      "Muziek@Rots2","Vlinder#Stoel9","Koala!Fiets7","Donder@Lepel4","Paraplu#Vis6","Gember!Brug3","Laptop@Wolk8","Krokodil!Bal5",
      "Roos#Ladder2","Muziek!Krab9","Tomaat@Deur7","Brood#Wolk4","Gitaar!Rots6","Paars@Hamer3","Tijger#Soep8","Kaars!Brug5",
      "Sneeuw@Trommel2","Koelkast!Tak9","Mango#Vlieg7","Boter!Steen4","Zwaan@Doos6","Kruik#Ster3","Ananas!Weg8","Slak@Boek5",
      "Regen#Stoel2","Komeet!Brood9","Hamer@Bloem7","Vlieg#Soep4","Paraplu!Ster6","Dak@Muziek3","Krokus#Boot8","Ijsbeer@Deur5",
      "Lap!Regen2","Kaart#Vlinder9","Peer!Komeet7","Zaag@Wolk4","Gitaar#Stoel6","Tomaat!Steen3","Vis@Ladder8","Gember#Bos5",
      "Kaars!Boek2","Koala@Regen9","Roos!Hamer7","Laptop#Tak4","Sneeuw!Vis6","Zwaan@Brood3","Donder#Doos8","Ananas!Brug5",
      "Paars@Slak2","Muziek#Weg9","Tijger!Bloem7","Mango@Stoel4","Regen#Zaag6","Koelkast!Ster3","Kruik@Vlieg8","Boter#Komeet5",
      "Vlinder!Soep2","Kaart@Tak9","Gitaar#Slak7","Peer!Lamp4","Fiets@Roos6","Boot#Muziek3","Steen!Kaars8","Bloem@Zaag5",
      "Deur#Tijger2","Wolk!Ananas9","Stoel@Donder7","Brug#Roos4","Ladder!Zwaan6","Krab@Gitaar3","Tak#Koelkast8","Weg!Kruik5"
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
      "RegenVallen!54","TijgerEten?99","PizzaBouwen!77","WinterRennen#90","RobotRennen!61","RegenLachen@26","RobotEten#14","RobotBouwen@41",
      "ZomerBouwen?73","PizzaDromen#77","DinoVallen?50","KattenSpringen#50","NinjaDromen@66","FietsSpringen!84","ZomerRennen#49","KoffieSpringen#39",
      "MarsSpelen?42","RegenBouwen?59","KattenLachen!17","NinjaEten@95","RegenDenken#65","DinoLachen!28","DinoRennen#76","SterrenRennen!16",
      "KoffieVallen#51","RegenVliegen!56","SpelDenken@53","RobotDromen?49","RegenLachen?86","RegenSpringen!85","SterrenVallen?61","ZomerDromen@61",
      "SpelBouwen#93","WinterEten?13","DinoVallen?10","SpelVliegen!28","RobotDromen#33","SterrenEten@57","BanaanBouwen#36","KoffieDenken!33",
      "NinjaDromen!54","SpelRennen!68","KoffieDromen@25","RobotVallen?52","NinjaSpringen?91","RegenVallen@72","BanaanSpelen?70","RobotVliegen?43",
      "BanaanDenken!51","WinterEten@61","MarsSpringen!45","SpelSpelen#72","KoffieVallen!60","TijgerBouwen@14","SterrenDromen#52","SpelEten@95",
      "ZomerVliegen#56","BanaanRennen!96","KattenBouwen#46","FietsRennen#22","BanaanEten?86","RobotDenken@49","BanaanDromen#22","WinterRennen#48",
      "DinoRennen#26","RegenEten!37","RobotSpringen?91","SpelEten#97","DinoDromen@82","BanaanRennen#25","ZomerRennen@53","PizzaEten?34",
      "SterrenEten!50","DinoDenken?81","NinjaVliegen#22","BanaanEten?93","FietsSpringen@95","RobotVallen@92","FietsDromen!70","BanaanSpelen!19"
    ]
  }
};

export default passwordSets;

