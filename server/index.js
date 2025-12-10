import { createServer } from 'http'
import { randomUUID } from 'crypto'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
const MAX_HISTORY = 50
const DEFAULT_ROOM = 'general'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map()

const getRoom = (name = DEFAULT_ROOM) => {
  const safeName = name.toString().trim() || DEFAULT_ROOM
  if (!rooms.has(safeName)) {
    rooms.set(safeName, [])
  }
  return rooms.get(safeName)
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  const joinRoom = (roomName = DEFAULT_ROOM) => {
    const room = roomName.toString().trim() || DEFAULT_ROOM

    if (socket.data.room) {
      socket.leave(socket.data.room)
    }

    socket.join(room)
    socket.data.room = room

    const history = getRoom(room)
    socket.emit('chat:history', { room, history })
  }

  joinRoom(DEFAULT_ROOM)

  socket.on('chat:join', ({ room }) => {
    joinRoom(room)
  })

  socket.on('chat:message', (payload) => {
    const user = (payload?.user ?? 'Guest').toString().slice(0, 24)
    const text = (payload?.text ?? '').toString().trim()
    const room = (payload?.room ?? socket.data.room ?? DEFAULT_ROOM)
      .toString()
      .trim()

    if (!text) return

    const message = {
      id: randomUUID(),
      user: user || 'Guest',
      text,
      room: room || DEFAULT_ROOM,
      timestamp: Date.now(),
    }

    const history = getRoom(room)
    history.push(message)

    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY)
    }

    io.to(room).emit('chat:message', message)
  })

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`)
  console.log(`Allowing client origin: ${CLIENT_ORIGIN}`)
})
