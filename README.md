# Chatter skeleton (Socket.IO + Vite)

Enkel én-roms chat (vanilla JS + Socket.IO). På denne test-branchen er alt fra kravlisten fjernet: ingen flere rom, ingen tegnbegrensning/varsler, ingen regler-pop-up, ingen Docker/Compose/Nginx, og ingen GitHub Actions-workflow. Under finner du steg-for-steg for å bygge det inn igjen selv.

## Kjør lokalt (npm)
```bash
npm install
npm run dev        # Vite-klient på 5173 + Socket.IO-server på 3001
# eller
npm run dev:client # bare klient
npm run dev:server # bare server
npm run lint
npm run build      # bygger klienten til dist
npm start          # starter serveren og serverer dist
```
Åpne `http://localhost:5173`, fyll inn navn og send meldinger i ett rom.

## Status i denne branchen
- Ett chat-rom, ingen rombytter.
- Ingen tegnbegrensning eller feilmeldinger for stoppede meldinger.
- Ingen regler-pop-up.
- Ingen Dockerfile/Compose/Nginx, ingen workflow-fil.

## Oppskrifter for å implementere kravene
Rekkefølgen følger oppgaveteksten.

### 1) Legg til flere chat-rom
1. **UI i `index.html`:** Legg inn et panel med knapper for rom (f.eks. `<button data-room="general">Felles</button>` og `<button data-room="team">Team</button>`) og et lite felt som viser aktivt rom.
2. **State i `src/main.js`:** Introduser `const ROOM_LABELS = { general: 'Felles', team: 'Team' }`, `let currentRoom = 'general'`, og et `Map` `roomMessages` for historikk per rom.
3. **Bytte rom:** Når en knapp klikkes, sett `currentRoom`, oppdater aktiv-knapp med CSS-klasse, tøm meldingscontaineren, og kall `socket.emit('chat:join', { room })` hvis socket er tilkoblet.
4. **Historikk:** På `chat:history`, lagre historikken i `roomMessages` for rommet; render bare hvis det er det aktive rommet. På `chat:message`, push inn i riktig array og render hvis rommet er aktivt.
5. **Server i `server/index.js`:** Lag `const rooms = new Map()` og en helper `getRoom(name)` som returnerer en array per rom. På `connection`, kall `joinRoom(DEFAULT_ROOM)` som gjør `socket.join(room)` og sender `chat:history` for rommet. På `chat:message`, bruk `room` fra payload/socket, legg til historikk og send med `io.to(room).emit(...)`.

### 2) Tegnbegrensning + feilmeldinger i frontend
1. **Server:** Sett `const MAX_MESSAGE_LENGTH = 280;` øverst i `server/index.js`. I `chat:message`, etter trimming, hvis `text.length > MAX_MESSAGE_LENGTH`, send `socket.emit('chat:error', { code: 'too_long', limit: MAX_MESSAGE_LENGTH, message: 'Meldingen stoppes fordi den er over 280 tegn.' })` og `return`.
2. **Markup:** I `index.html`, legg til `<p id="messageError" class="notice notice--error" aria-live="assertive"></p>` og en teller `<p class="counter"><span id="messageCount">0</span>/280</p>` nær inputen. Sett `maxlength="280"` på `#messageInput`.
3. **Klientlogikk:** I `src/main.js`, lytt på `messageInput` `input`-event for å oppdatere telleren og sette en lokal `overLimit`-bool. I `sendMessage`, hvis `overLimit`, vis en feilmelding og returner. Lytt på `socket.on('chat:error', ...)` og vis tekst i `messageError`.
4. **Stil i `src/styles/App.scss`:** Legg til `.notice--error` (lys rød bakgrunn/border) og `.counter` ved inputen. Gi `button:disabled` en tydelig stil.

### 3) Regler-pop-up etter innlogging
1. **Markup:** Legg en modal nederst i `body`, f.eks. `<div id="rulesModal" class="modal is-hidden" role="dialog" aria-modal="true">... regler ...</div>` med en “Jeg forstår”-knapp.
2. **Logikk:** Når brukeren fyller inn navn første gang, sjekk `localStorage.getItem('rulesSeen')`. Hvis ikke satt, åpne modalen (fjern `is-hidden`), fokuser knappen, disable sendeknapp inntil modalen lukkes. På lukk, sett `rulesSeen = '1'`.
3. **Stil:** `.modal` som mørk overlay (fixed, fullskjerm), `.modal__content` sentrert panel med padding og avrunding. Bruk `aria-live="polite"` på regel-listen hvis du vil, og fang Tab-fokus i modalen for ekstra tilgjengelighet.

### 4) Tilpassede feilmeldinger
- Når navn mangler: vis rød tekst under navnefeltet (“Skriv inn navnet ditt for å sende”).
- Når frakoblet: vis en banner/notice (“Ingen forbindelse – prøv igjen senere”).
- Når melding stoppes (for lang/tom): bruk `messageError`-feltet med klar årsak.
- Sørg for `aria-live="assertive"` på felelementet for tilgjengelighet.

### 5) Fullfør Dockerfile, docker-compose og Nginx
1. **Dockerfile:** Lag multi-stage:
   - Base med Node 20 på Ubuntu/Alpine.
   - Builder: kopier `package*.json`, `npm ci`, kopier resten, `npm run build`.
   - Server-stage: `npm ci --omit=dev`, kopier `server/` og `dist/`, `EXPOSE 3001`, `CMD ["node","server/index.js"]`.
   - Nginx-stage: `FROM nginx:alpine`, kopier `dist/` til `/usr/share/nginx/html`, kopier `docker/nginx.conf`.
2. **docker-compose.yml:** Tjeneste `app` (bygger `target: server`, env `PORT`, `CLIENT_ORIGIN`, port 3001) og `nginx` (bygger `target: nginx`, avhengig av app, port 80).
3. **Nginx-konfig (`docker/nginx.conf`):** `location / { try_files $uri $uri/ /index.html; }` og `location /socket.io/ { proxy_pass http://app:3001; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade"; proxy_set_header Host $host; proxy_read_timeout 60s; }`.
4. **Kjør:** `docker compose up -d --build`, åpne `http://localhost`, og sjekk WebSocket-oppgradering i nettverksfanen.

### 6) Ferdig workflow-fil som eksempel (GitHub Actions)
Lag `.github/workflows/ci.yml` med:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 20, cache npm)
3. `npm ci`
4. `npm run lint`
5. `npm run build`
6. `docker/setup-buildx-action@v3`
7. To `docker/build-push-action@v6` steg (targets `server` og `nginx`, `push: false`, tags som `local/socketio-app:ci` og `local/socketio-nginx:ci`).

## Feilsøking
- Socket kobler ikke: sjekk at server kjører på 3001 og at `VITE_SOCKET_URL` peker riktig.
- Ingen meldinger etter bytte av rom: sjekk at `chat:join` sendes og at serveren legger til `socket.join(room)`.
- Proxy-problemer: verifiser `Upgrade`/`Connection`-headerne i Nginx og at `CLIENT_ORIGIN` er satt til riktig origin.
