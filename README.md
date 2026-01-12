# Chatter (Socket.IO + Vite)

Simple multi-room chat with a Socket.IO server and a Vite client.

## Features
- Rooms: general, team, random
- Client-side message limit: 200 characters
- Room history (last 50 messages)
- Docker + Nginx production setup

## Requirements
- Node.js 20+ (local development)
- Docker + Docker Compose (production)

## Local development
```bash
npm install
npm run dev        # Vite client on 5173 + Socket.IO server on 3001
# or
npm run dev:client # only client
npm run dev:server # only server
npm run lint
```
Open `http://localhost:5173`.

## Build
```bash
npm run build
```
Build outputs to `dist/`. This project does not serve static files from Node; use Nginx or another static server for the client.

## Configuration
- `PORT` (server, default: `3001`)
- `CLIENT_ORIGIN` (server CORS, default: `http://localhost:5173`)
  - Can be a comma-separated list: `http://site.com,https://site.com`
- `VITE_SOCKET_URL` (client, optional)
  - In dev it defaults to `http://localhost:3001`
  - In production it defaults to `window.location.origin`

## Docker + Nginx (production)
1) Update `docker-compose.yml`:
   - Set `CLIENT_ORIGIN` to your domain or IP (use `https://...` if you serve over TLS).

2) Build and run:
```bash
docker compose up -d --build
```

3) Open `http://<server-ip>` or `http://<domain>`.

## Files of interest
- `server/index.js` - Socket.IO server
- `src/main.js` - client logic
- `Dockerfile.server` - Node server image
- `Dockerfile.nginx` - client build + Nginx image
- `nginx.conf` - static hosting + WebSocket proxy
- `docker-compose.yml` - production stack

## Troubleshooting
- Socket not connecting: check `CLIENT_ORIGIN` and that `server` is reachable on port 3001 inside Docker.
- No UI in browser: confirm `nginx` container is running and port 80 is open.
- WebSocket issues: ensure Nginx `Upgrade`/`Connection` headers are set in `nginx.conf`.
