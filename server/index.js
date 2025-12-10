import { createServer } from 'http'
import { randomUUID } from 'crypto'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
const MAX_HISTORY = 50
const history = []

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.emit('chat:history', { history })

  socket.on('chat:message', (payload) => {
    const user = (payload?.user ?? 'Guest').toString().slice(0, 24)
    const text = (payload?.text ?? '').toString().trim()

    if (!text) return

    const message = {
      id: randomUUID(),
      user: user || 'Guest',
      text,
      timestamp: Date.now(),
    }

    history.push(message)

    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY)
    }

    io.emit('chat:message', message)
  })

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`)
  console.log(`Allowing client origin: ${CLIENT_ORIGIN}`)
})
