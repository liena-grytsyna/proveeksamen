import { createServer } from 'http'
import { randomUUID } from 'crypto'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
const MAX_HISTORY = 50
const roomHistories = new Map()

const getRoomHistory = (room) => {
  if (!roomHistories.has(room)) {
    roomHistories.set(room, [])
  }
  return roomHistories.get(room)
}

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Присоединяем к комнате по умолчанию
  socket.join('general')
  socket.emit('chat:history', { room: 'general', history: getRoomHistory('general') })

  // Обработка смены комнаты
  socket.on('chat:join', (payload) => {
    const room = payload?.room || 'general'
    
    // Покидаем все текущие комнаты
    socket.rooms.forEach((r) => {
      if (r !== socket.id) socket.leave(r)
    })
    
    // Присоединяемся к новой комнате
    socket.join(room)
    console.log(`Client ${socket.id} joined room: ${room}`)
    
    // Отправляем историю этой комнаты
    socket.emit('chat:history', { room, history: getRoomHistory(room) })
  })

  socket.on('chat:message', (payload) => {
    const user = (payload?.user ?? 'Guest').toString().slice(0, 24)
    const text = (payload?.text ?? '').toString().trim()
    const room = payload?.room || 'general'

    if (!text) return

    const message = {
      id: randomUUID(),
      user: user || 'Guest',
      text,
      timestamp: Date.now(),
      room,
    }

    const history = getRoomHistory(room)
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
