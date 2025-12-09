# To chater med Socket.IO, Vite og Sass

To rom i ett vindu: «general» (Oby) og «team». Klienten er skrevet i ren JavaScript uten React, stylet med Sass, og kjører på Vite. Socket.IO-serveren holder egen historikk per rom.

## Hva er bygget
- To chat-rom med bryter i UI og visning av aktivt rom.
- Historikk per rom (inntil 50 meldinger) lagres i minne på serveren.
- Status for tilkobling (connecting/online/error) styrer send-knapp.
- Sass-baserte stiler med gradientbakgrunn og kortlayout.
- ESLint er satt opp for både klient og server.

## Kom i gang
```bash
npm install
npm run dev
```
- Åpne `http://localhost:5173`.
- Bytt mellom «general» og «team», skriv meldinger og åpne en ekstra fane/nettleser for å se synkronisering.

## Nyttekommandoer
- `npm run dev` / `npm run dev:all` – starter klient (5173) og server (3001).
- `npm run dev:client` – kun Vite-klienten.
- `npm run dev:server` – kun Socket.IO-serveren.
- `npm run lint` – ESLint på hele prosjektet.
- `npm run build` – prod-bygg av klienten.
- `npm start` – kun server (nyttig etter bygg).

## CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`.
- Запускается на push/PR в `main`, выполняет `npm ci`, `npm run lint`, `npm run build`, а также пробное `docker build` для таргетов `server` и `nginx`.

## Miljøvariabler
- `VITE_SOCKET_URL` – URL til Socket.IO for klienten (default `http://localhost:3001`).
- `PORT` – port for serveren (default `3001`).
- `CLIENT_ORIGIN` – CORS-origin som tillates (default `http://localhost:5173`).

## Struktur
```
server/index.js        # Socket.IO-server, rom og historikk
src/main.js            # Vanilla-klient med rombytte og statusvisning
src/styles/index.scss  # Basisstiler, variabler, bakgrunn
src/styles/App.scss    # Layout, rombryter, chat-stiler
index.html             # Enkel HTML uten React
```

## Slik virker det
- Klienten kobler til Socket.IO og blir med i rommet `general` som start, og kan bytte til `team`.
- Serveren lagrer meldinger per rom (maks 50) og sender dem kun til brukere i det samme rommet.
- UI oppdaterer status for tilkobling; send-knappen er deaktivert når forbindelsen ikke er online.
