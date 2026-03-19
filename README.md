# QA-Kamp
Een QA-kamp, waar jongeren kinderen tussen 8 en 16 jaar spelletjes spelen en zich kunnen verdiepen in de wereld van IT en softwaretesting.

Deze repository bevat alleen code; gevoelige gegevens (wachtwoorden, DB-credentials, API-keys) horen niet in de repo. Zie de sectie "Environment variables" hieronder.

# Gebruik (lokale ontwikkeling)

Backend
- Ga naar `./Backend`
- Installeer dependencies:

```powershell
cd Backend
npm install
```

- De backend verwacht een `.env` bestand met je lokale/hosted configuratie. Er is een `Backend/.env.example` aanwezig die je als sjabloon kunt gebruiken. Maak een `.env` (niet committen!) en vul je eigen waarden in, bijvoorbeeld:

```dotenv
# Backend/.env (voorbeeld)
DB_URI=
ORGANIZER1_EMAIL=
ORGANIZER1_PASSWORD=
JWT_SECRET=
FRONTEND_ORIGIN=
```

- Let op: `.env` staat in `.gitignore` en mag nooit gecommit worden.

- Seed (maak default organizers aan) en zorg dat je `DB_URI` correct wijst naar je database:

```powershell
npm run seed
```

- Start de backend in ontwikkelmodus:

```powershell
npm run dev
```

Frontend
- Ga naar `./Frontend/QA-Kamp`
- Install dependencies:

```powershell
cd Frontend/QA-Kamp
npm install
```

- De frontend gebruikt environment variables via Vite (`.env` / `.env.local` in de frontend map). Er is een `./Frontend/QA-Kamp/.env.example` (indien aanwezig) die laat zien welke variabelen nodig zijn (bv. VITE_API_URL). Vul je eigen `.env` aan zoals:

```dotenv
# Frontend/.env (voorbeeld)
VITE_API_URL=http://localhost:4000/api
```

- Start de frontend:

```powershell
npm run dev
```

# Environment variables (belangrijk)
- Zet gevoelige configuratie (DB-URL, DB user/password, JWT secret, API keys) in environment variables (een lokaal `.env` voor development). Bijvoorbeeld:
  - `MONGO_URI` (backend)
  - `ORGANIZER1_EMAIL`, `ORGANIZER1_PASSWORD`, enz. (backend seed)
  - `JWT_SECRET` (backend)
  - `VITE_API_URL` (frontend)
- Voeg je `.env` toe aan `.gitignore` (dit project bevat al `.env` in `.gitignore`).
- Plaats in de repo wél een `.env.example` met de sleutelnamen (zonder secrets) zodat anderen weten wat ingevuld moet worden.

# Productie
- Gebruik managed secrets / environment variables van je hostingprovider (Vercel, Heroku, AWS, enz.) in plaats van `.env`.
- Controleer dat je database toegangsregels (IP whitelist / network access) toestaan dat je backend verbinding kan maken.

# Troubleshooting
- Foutmelding "Foute logingegevens" terwijl credentials correct zijn?
  - Controleer of de gebruikers zijn geseed in de database (gebruik `npm run seed`).
  - Controleer `MONGO_URI` en verbindingsrechten.
  - Controleer dat de frontend POST naar de juiste API URL (VITE_API_URL).

# Overige opmerkingen
- De seed-scripts in de backend lezen credentials uit environment variables en creëren accounts alleen wanneer de `organizers`-collectie leeg is. Dit voorkomt dat plaintext-credentials in de repo terechtkomen.

