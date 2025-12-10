# HOWTO: Exam requirements (step by step)

Dette dokumentet viser hvordan du kan implementere kravene i tre kategorier: Utvikling, Brukerstotte og Driftsstotte. Foelg rekkefolgen for minst friksjon.

## Forutsetninger
- Kjoer lokalt: `npm install`, `npm run dev` (klient 5173 + server 3001).
- Klientfiler: `index.html`, `src/main.js`, `src/styles/App.scss`.
- Serverfil: `server/index.js`.

---

## Utvikling

### A) Nytt chat-rom i eksisterende kode
1) **UI (index.html)**: Legg til et rom-panel med to knapper og en label:
   ```html
   <div class="switcher" id="roomSwitcher" role="tablist" aria-label="Rom">
     <button class="switcher__tab is-active" data-room="general" role="tab" aria-selected="true">Felles</button>
     <button class="switcher__tab" data-room="team" role="tab" aria-selected="false">Team</button>
     <div class="switcher__info">Aktivt rom: <span id="activeRoomLabel">Felles</span></div>
   </div>
   ```
   ```scss
   // husk: @use './variables' as vars; overst i SCSS-filen
   .switcher {
     display: flex;
     align-items: center;
     gap: 0.75rem;
     margin: 1.5rem 0 0.5rem;
     background: var(--panel);
     border: 1px solid var(--border);
     border-radius: 14px;
     padding: 0.75rem 1rem;
     box-shadow: var(--shadow);
     flex-wrap: wrap;
   }
   .switcher__tab {
     padding: 0.65rem 1rem;
     border-radius: 12px;
     border: 1px solid transparent;
     background: vars.$glass-04;
     color: var(--text-primary);
     box-shadow: none;
   }
   .switcher__tab.is-active {
     background: linear-gradient(135deg, rgba(255, 138, 61, 0.18), rgba(25, 185, 149, 0.18));
     border-color: rgba(255, 255, 255, 0.12);
   }
   .switcher__info {
     color: var(--text-secondary);
     margin-left: auto;
     font-weight: 600;
     display: flex;
     align-items: center;
     gap: 0.35rem;
   }
   ```
2) **Klient-state (src/main.js)**:
   - Legg til `const ROOM_LABELS = { general: 'Felles', team: 'Team' }`.
   - Legg til `let currentRoom = 'general'` og `const roomMessages = new Map()`.
3) **Bytte rom**:
   - Lag funksjon `joinRoom(room)` som:
     - setter `currentRoom = room`;
     - oppdaterer aktiv knapp/aria-selected;
     - toemmer `messagesContainer.innerHTML = ''`;
     - `socket.emit('chat:join', { room })` hvis tilkoblet;
     - kaller `renderMessages()` for valgt rom.
   - Lytt paa `click` paa `#roomSwitcher` (event delegation), finn naermeste `.switcher__tab`, sammenlikn `data-room`, og kall `joinRoom`.
4) **Historikk per rom**:
   - Lag helper `ensureRoom(room)` som oppretter `roomMessages.set(room, [])` ved behov og returnerer arrayet.
   - Paa `chat:history`: hent `room` fra payload (default `currentRoom`), `roomMessages.set(room, history)`, og render bare hvis `room === currentRoom`.
   - Paa `chat:message`: finn `room = incoming.room || currentRoom`; `ensureRoom(room).push(incoming)`; render hvis aktivt rom.
5) **Render**: I `renderMessages`, hent `const list = ensureRoom(currentRoom)` og loop over den.

### B) Tegnbegrensning med validering og feilmeldinger
Velg grense, f.eks. 280 tegn.

**Server (server/index.js):**
```js
const MAX_MESSAGE_LENGTH = 280; // topp-nivaa
...
socket.on('chat:message', (payload) => {
  const text = (payload?.text ?? '').toString().trim();
  if (!text) return;
  if (text.length > MAX_MESSAGE_LENGTH) {
    socket.emit('chat:error', {
      code: 'too_long',
      limit: MAX_MESSAGE_LENGTH,
      message: `Meldingen stoppes fordi den er over ${MAX_MESSAGE_LENGTH} tegn.`
    });
    return;
  }
  // eksisterende melding + broadcast
});
```

**Klient (index.html + src/main.js):**
1) Legg til under inputen:
   ```html
   <p id="messageError" class="notice notice--error" aria-live="assertive"></p>
   <p class="counter"><span id="messageCount">0</span>/280</p>
   ```
   Sett ogsaa `maxlength="280"` paa `#messageInput`.
2) I `src/main.js`:
   - Sett `const MAX_MESSAGE_LENGTH = 280;`.
   - Lytt paa `messageInput.addEventListener('input', ...)`: oppdater `messageCount`, sett en `overLimit` bool naar `text.length > MAX_MESSAGE_LENGTH`, og oppdater `sendButton.disabled` hvis over grensen.
   - I `sendMessage`, hvis `overLimit`, kall `showError('Meldingen er for lang (maks 280 tegn)')` og `return`.
   - Lytt paa `socket.on('chat:error', (err) => showError(err?.message || 'Meldingen ble stoppet.'))`.
   - Implementer `showError(msg)` som setter `messageError.textContent = msg` og toggler en CSS-klasse for synlighet.

**Stil (src/styles/App.scss):**
```scss
.notice--error {
  margin: 0.35rem 0 0;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 99, 99, 0.12);
  border: 1px solid rgba(255, 99, 99, 0.4);
  color: #ff6b6b;
}
.counter {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: right;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### C) Oppdater UI for nye varsler
- Soerg for at feilelementer (`messageError`) er tydelig plassert under inputen.
- Bruk `aria-live="assertive"` for feilmeldinger og `aria-live="polite"` for statusfelt om onskelig.
- Legg til tilstands-klasser paa sendeknapp (normal/disabled) slik at brukeren ser naar meldingen ikke kan sendes.

---

## Brukerstotte

### A) Pop-up med regler etter innlogging
1) **Markup (index.html):**
   ```html
   <div id="rulesModal" class="modal is-hidden" role="dialog" aria-modal="true">
     <div class="modal__content">
       <h2>Regler</h2>
       <ol>
         <li>Hold deg til tema.</li>
         <li>Ikke del personopplysninger.</li>
         <li>Maks 280 tegn per melding.</li>
       </ol>
       <button id="rulesClose">Jeg forstar</button>
     </div>
   </div>
   ```
2) **Logikk (src/main.js):**
   - Ved forste gang brukeren fyller inn navn: sjekk `localStorage.getItem('rulesSeen')`.
   - Hvis ikke satt: vis modalen (fjern `is-hidden`), disable sendeknapp, fokuser close-knappen.
   - Paa lukking: sett `localStorage.setItem('rulesSeen', '1')`, skjul modalen, reaktiver sendeknapp.
3) **Stil (App.scss):**
   ```scss
   .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; }
   .modal.is-hidden { display: none; }
   .modal__content { background: #111; padding: 1.5rem; border-radius: 12px; width: min(520px, 90vw); }
   ```
   Valgfritt: fang Tab-fokus inne i modalen for ekstra tilgjengelighet.

### B) Tilpass feilmeldinger (forklar hvorfor stoppet)
- Tom melding: "Meldingen ble stoppet fordi den er tom."
- For lang: "Meldingen ble stoppet fordi den er over 280 tegn."
- Mangler navn: "Skriv inn navnet ditt for aa sende."
- Frakoblet: "Ingen forbindelse - prov igjen senere."
Plasser tekstene i `messageError` eller et eget banner med `aria-live="assertive"`.

### C) Oppdater README med brukerveiledning og regler
- Legg til en seksjon "Regler" med punktliste.
- Legg til skjermbilder/gifs etter behov.
- Beskriv kort hvordan navn settes, hvordan rom byttes, og hva som skjer naar meldinger stoppes.

---

## Driftsstotte

### A) Fullfoer Dockerfile og docker-compose
**Dockerfile (eksempel multi-stage):**
```Dockerfile
FROM ubuntu:22.04 AS base
ENV DEBIAN_FRONTEND=noninteractive NODE_VERSION=20
RUN apt-get update && apt-get install -y ca-certificates curl gnupg \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && apt-get update && apt-get install -y nodejs && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS server
ENV NODE_ENV=production PORT=3001 CLIENT_ORIGIN=http://localhost:5173
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "server/index.js"]

FROM nginx:1.25-alpine AS nginx
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
```

**docker-compose.yml:**
```yaml
version: "3.9"
services:
  app:
    build:
      context: .
      target: server
    environment:
      PORT: 3001
      CLIENT_ORIGIN: http://localhost
    ports:
      - "3001:3001"

  nginx:
    build:
      context: .
      target: nginx
    depends_on:
      - app
    ports:
      - "80:80"
```

### B) Konfigurer Nginx som reverse proxy
Opprett `docker/nginx.conf`:
```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

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

### C) Starte med docker-compose
```bash
docker compose up -d --build
docker compose logs -f app nginx
```
Aapne `http://localhost` (nginx), og verifiser at WebSocket oppgraderer i nettverksfanen.

### D) Workflow-fil som eksempel paa automatisering
Lag `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  lint-build-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          target: server
          push: false
          tags: local/socketio-app:ci
      - uses: docker/build-push-action@v6
        with:
          context: .
          target: nginx
          push: false
          tags: local/socketio-nginx:ci
```
Tilpass node-versjon, legg til tester, eller slaa paa push ved behov.

---

## Sjekkliste naar du er ferdig
- [ ] Bytte mellom rom fungerer, historikk er per rom.
- [ ] Tegnbegrensning haandheves paa server; frontend viser teller og feilmeldinger.
- [ ] Regler-pop-up vises en gang per bruker (lagres i localStorage).
- [ ] README er oppdatert med brukerveiledning + regler.
- [ ] Docker/compose/nginx starter og proxier til appen.
- [ ] Workflow ligger i `.github/workflows/ci.yml` og kjoerer lint/build/docker-build.
