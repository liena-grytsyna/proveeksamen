# HOWTO: Komplett oppskrift med kode

Under er en fullstendig bruksanvisning med ferdige kodeblokker du kan lime inn. Rekkefolge: Utvikling (rom, validering, UI), Brukerstotte (regler/feilmeldinger/README), Driftsstotte (Docker/Nginx/CI).

## Forutsetninger
- Lokalt: `npm install`, `npm run dev` (klient 5173, server 3001).
- Filer du endrer: `index.html`, `src/main.js`, `src/styles/_chat.scss` (og evt. `App.scss`), `server/index.js`, `README.md`.

---

## Utvikling

### 1) Flere chat-rom — ferdige innsatser

**1.1 Markup (`index.html`)** — legg inn over chatten:
```html
<div class="switcher" id="roomSwitcher" role="tablist" aria-label="Rom">
  <button class="switcher__tab is-active" data-room="general" role="tab" aria-selected="true">Felles</button>
  <button class="switcher__tab" data-room="team" role="tab" aria-selected="false">Team</button>
  <div class="switcher__info">Aktivt rom: <span id="activeRoomLabel">Felles</span></div>
</div>
```

**1.2 Klient (`src/main.js`)** — legg til/erstatt relevante deler:
```js
// Rom-konstanter og state
const ROOM_LABELS = { general: 'Felles', team: 'Team' }
let currentRoom = 'general'
const roomMessages = new Map()
const switcher = document.getElementById('roomSwitcher')
const activeRoomLabel = document.getElementById('activeRoomLabel')

// Hjelpere for rom
const ensureRoom = (room) => {
  if (!roomMessages.has(room)) roomMessages.set(room, [])
  return roomMessages.get(room)
}
const renderRoom = () => showHistory(ensureRoom(currentRoom))
## HOWTO: Komplett, eksamensklar løsning

Dette dokumentet gir en komplett og praktisk oppskrift du kan bruke under eksamen. Den beskriver hvordan du:

- implementerer et nytt chat-rom (flere rom)
- legger inn tegnbegrensning med frontend- og backend-validering + tydelige feilmeldinger
- oppdaterer UI for varsler og pop-ups (regler etter innlogging)
- ferdigstiller Docker/Docker Compose og Nginx som reverse proxy
- legger ved et eksempel på GitHub Actions workflow

Følg rekkefølgen: Utvikling → Brukerstøtte → Driftsstøtte. Kopier de relevante kodeblokkene direkte inn i prosjektet.

## Forutsetninger

- Node 18+ / 20 anbefalt
- `npm install` i repo-rot
- Dev-server klient: vanligvis `npm run dev` (Vite port 5173)
- Server: `node server/index.js` (port 3001 eller via Docker)

Filer du typisk oppdaterer: `index.html`, `src/main.js`, `src/styles/_chat.scss` (eller `App.scss`), `server/index.js`, `README.md`.

---

## Utvikling

Målet: flere chat-rom, robust melding-validering (maks 280 tegn), og tydelige feilmeldinger i frontend.

1) Nytt chat-rom

- Markup (`index.html`) — knappesett for romvalg (legg dette i chat-headeren):

```html
<div class="switcher" id="roomSwitcher" role="tablist" aria-label="Rom">
  <button class="switcher__tab is-active" data-room="general" role="tab" aria-selected="true">Felles</button>
  <button class="switcher__tab" data-room="team" role="tab" aria-selected="false">Team</button>
  <div class="switcher__info">Aktivt rom: <span id="activeRoomLabel">Felles</span></div>
</div>
```

- Klientlogikk (`src/main.js`) — romstyring og historie. Nøkkelelementer:

```md
Kort: legge til et nytt chat-rom

1) I `index.html` — legg til en knapp i switcheren ved behov:

```html
<button class="switcher__tab" data-room="<NY_ID>" role="tab">Etikett</button>
```

2) I `src/main.js` — legg til en etikett i `ROOM_LABELS` (valgfritt):

```js
ROOM_LABELS['<NY_ID>'] = 'Etikett'
```

Klienten bruker `data-room` for å sende/filtrere meldinger. Serveren må sette/lese `payload.room` for å håndtere rom riktig.
```

På serversiden må du ta imot `payload.room` og lagre/emittere meldingen til riktig rom (se server-eksempel under).

2) Tegnbegrensning og tydelige feilmeldinger

- Frontend markup (legg under tekstfeltet for input):

```html
<p id="messageError" class="notice notice--error" aria-live="assertive"></p>
<p class="counter"><span id="messageCount">0</span>/280</p>
```

Sett også `maxlength="280"` på input/textarea for enkel UX (men husk backend-validering alltid!).

- Frontend logikk (`src/main.js`):

```js
const MAX_MESSAGE_LENGTH = 280
const messageInput = document.getElementById('messageInput')
const messageError = document.getElementById('messageError')
const messageCount = document.getElementById('messageCount')

function showError(msg) { if (messageError) messageError.textContent = msg || '' }

messageInput?.addEventListener('input', () => {
  const len = messageInput.value.length
  if (messageCount) messageCount.textContent = len
  if (len > MAX_MESSAGE_LENGTH) {
    showError(`Meldingen er for lang (maks ${MAX_MESSAGE_LENGTH} tegn).`)
  } else {
    showError('')
  }
})

// Når bruker trykker send
function handleSend() {
  const text = messageInput.value.trim()
  if (!text) { showError('Meldingen ble stoppet fordi den er tom.'); return }
  if (text.length > MAX_MESSAGE_LENGTH) { showError(`Meldingen er for lang (maks ${MAX_MESSAGE_LENGTH} tegn).`); return }
  // send videre
  sendMessage(text)
  messageInput.value = ''
  messageCount.textContent = '0'
}

// lytte etter server-feil
socket.on('chat:error', (err) => showError(err?.message || 'Meldingen ble stoppet.'))
```

- Backend validering (`server/index.js`) — legges i `chat:message` handler:

```js
const MAX_MESSAGE_LENGTH = 280

socket.on('chat:message', (payload = {}) => {
  const user = (payload.user ?? 'Guest').toString().slice(0, 24)
  const text = (payload.text ?? '').toString().trim()
  const room = payload.room || 'general'
  if (!text) {
    socket.emit('chat:error', { code: 'empty', message: 'Meldingen er tom.' })
    return
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    socket.emit('chat:error', { code: 'too_long', limit: MAX_MESSAGE_LENGTH, message: `Meldingen stoppes fordi den er over ${MAX_MESSAGE_LENGTH} tegn.` })
    return
  }
  // lagre og emit
  const message = { id: randomUUID(), user, text, timestamp: Date.now(), room }
  const history = getRoom(room)
  history.push(message)
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY)
  io.to(room).emit('chat:message', message)
})
```

3) UI / SCSS (hurtigstil)

Legg i `src/styles/_chat.scss` eller tilsvarende:

```scss
.notice--error { margin: .35rem 0 0; padding: .5rem .75rem; border-radius: 10px; background: rgba(255,79,97,.12); border: 1px solid rgba(255,79,97,.35); color: #ffb3bc; }
.counter { margin: .2rem 0 0; color: var(--text-secondary); font-size: .9rem; text-align: right }
.switcher__tab.is-active { background: var(--accent); color: #fff }
```

---

## Brukerstøtte

1) Regler-popup etter innlogging

- Markup (legg i `index.html` rett før `</body>`):

```html
<div id="rulesModal" class="modal is-hidden" role="dialog" aria-modal="true">
  <div class="modal__content">
    <h2>Regler</h2>
    <ol>
      <li>Hold deg til tema.</li>
      <li>Ikke del personopplysninger.</li>
      <li>Maks 280 tegn per melding.</li>
    </ol>
    <button id="rulesClose">Jeg forstår</button>
  </div>
</div>
```

- Enkel CSS (samme SCSS-fil):

```scss
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center }
.modal.is-hidden { display:none }
.modal__content { background: var(--panel); padding: 1.5rem; border-radius: 14px; width: min(520px, 90vw) }
```

- Logikk (`src/main.js`):

```js
const rulesModal = document.getElementById('rulesModal')
const rulesClose = document.getElementById('rulesClose')

function maybeShowRules() {
  if (!rulesModal || !rulesClose) return
  if (localStorage.getItem('rulesSeen')) return
  rulesModal.classList.remove('is-hidden')
  rulesClose.focus()
}

rulesClose?.addEventListener('click', () => { rulesModal.classList.add('is-hidden'); localStorage.setItem('rulesSeen','1') })

// Kall maybeShowRules etter login/brukernavn er satt
// f.eks. etter at brukeren fyller inn navn eller trykker "logg inn"
```

2) Tydelige feilmeldinger

- Bruk aria-live (`aria-live="assertive"`) på `#messageError` så skjermlesere fanges opp.
- Send feilkoder fra server (`code: 'too_long'`) og vis menneskelig tekst i frontend.
- Ha egne meldinger for: tom melding, for lang, frakobling, manglende navn.

3) README-oppdatering (kort forslag du kan lime inn i `README.md`)

Legg til en seksjon "Quick start" og "Regler":

```md
## Quick start
- npm install
- npm run dev   # utvikling
- node server/index.js  # start backend

## Funksjoner
- Flere chat-rom
- Meldingslengde-grense: 280 tegn
- Regler-popup ved første innlogging

## Regler
1. Hold deg til tema.
2. Ikke del personopplysninger.
3. Maks 280 tegn per melding.
```

---

## Driftsstøtte

1) Dockerfile (eksempel)

Lag en `Dockerfile` i prosjektrot med flerstegs-build (bygger frontend, kjører server):

```Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS server
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=builder /app/dist ./dist
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]

# Valgfri: bygge en nginx image for static hosting
FROM nginx:alpine AS nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
```

2) docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      target: server
    environment:
      - PORT=3001
      - CLIENT_ORIGIN=http://localhost
    ports:
      - '3001:3001'
  nginx:
    build:
      context: .
      target: nginx
    depends_on:
      - app
    ports:
      - '80:80'
```

3) Nginx config for ws reverse proxy (`docker/nginx.conf`)

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /socket.io/ {
    proxy_pass http://app:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 60s;
  }
}
```

4) Starte systemet lokalt med Docker

- Bygg og start: `docker compose up -d --build`
- Åpne `http://localhost` i nettleseren. Websocket-tilkoblingen vil gå via Nginx til `app:3001`.
- Verifiser i nettverksfanen at `/socket.io/` har en 101-protokoll (Upgrade).

5) Eksempel GitHub Actions workflow (valgfritt) — `.github/workflows/ci.yml`

Dette er et enkelt eksempel som bygger, lint'er og bygger Docker images (uten å pushe):

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint || true
      - run: npm run build
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          target: server
          push: false
          tags: local/socketio-app:ci

```

---

## Verifikasjon / kontroll-liste (bruk under eksamen)

1. Bytt rom i UI — meldinger fra valgt rom vises.
2. Skriv en for lang melding (>280) — frontend viser feilmelding, server sender `chat:error`.
3. Første gang etter login — regler-popup vises og kan lukkes (lagres i localStorage).
4. Start via Docker: `docker compose up -d --build` — åpne `http://localhost`.

## Hva jeg endret/tilbyr i HOWTO

- Fullstendige kodeeksempler for klient og server (rom + validering).
- SCSS-eksempler for synlige feilmeldinger og rom-switcher.
- Dockerfile, docker-compose.yml og `nginx.conf` for produksjons-sannsynlig oppsett.
- Eksempel CI workflow.

Lykke til på eksamen — kopier inn kodeblokkene i repoet, kjør testene/bygget og verifiser funksjonaliteten lokalt. Om du vil kan jeg også legge ferdige filer (Dockerfile, docker/nginx.conf, og workflow) direkte inn i repoet.

```
