import './styles/index.scss'
import './styles/App.scss'
import { io } from 'socket.io-client'

const fallbackSocketUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:3001'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? fallbackSocketUrl

const ROOM_LABELS = {
  general: 'Felles',
  team: 'Team',
}

let username = `Gjest-${Math.floor(Math.random() * 900 + 100)}`
let currentRoom = 'general'
const roomMessages = new Map()
let socket = null

const usernameInput = document.getElementById('usernameInput')
const messageInput = document.getElementById('messageInput')
const messageForm = document.getElementById('messageForm')
const sendButton = document.getElementById('sendButton')
const messagesContainer = document.getElementById('messagesContainer')
const statusElement = document.getElementById('status')
const statusText = statusElement.querySelector('.status__text')
const activeRoomLabel = document.getElementById('activeRoomLabel')
const roomSwitcher = document.getElementById('roomSwitcher')

usernameInput.value = username

function ensureRoom(room) {
  if (!roomMessages.has(room)) {
    roomMessages.set(room, [])
  }
  return roomMessages.get(room)
}

function initSocket() {
  socket = io(SOCKET_URL, {
    autoConnect: false,
  })

  socket.on('connect', () => {
    updateStatus('connected', 'tilkoblet')
    joinRoom(currentRoom)
  })

  socket.on('disconnect', () => {
    updateStatus('disconnected', 'frakoblet')
  })

  socket.on('connect_error', () => {
    updateStatus('error', 'feil')
  })

  socket.on('chat:history', ({ room, history = [] } = {}) => {
    const targetRoom = room || currentRoom
    roomMessages.set(targetRoom, history)
    if (targetRoom === currentRoom) {
      renderMessages()
    }
  })

  socket.on('chat:message', (incoming) => {
    const room = incoming?.room || currentRoom
    const list = ensureRoom(room)
    list.push(incoming)

    if (room === currentRoom) {
      renderMessages()
    }
  })

  updateStatus('connecting', 'kobler til...')
  socket.connect()
}

function updateStatus(status, text) {
  statusElement.classList.remove('status--connected', 'status--disconnected', 'status--error', 'status--connecting')
  statusElement.classList.add(`status--${status}`)
  statusText.textContent = text
  sendButton.disabled = status !== 'connected'
}

function joinRoom(room) {
  currentRoom = room
  activeRoomLabel.textContent = ROOM_LABELS[room] || room
  updateSwitcher(room)
  messagesContainer.innerHTML = ''

  if (socket?.connected) {
    socket.emit('chat:join', { room })
  }

  renderMessages()
}

function updateSwitcher(room) {
  const buttons = roomSwitcher.querySelectorAll('.switcher__tab')
  buttons.forEach((btn) => {
    const isActive = btn.dataset.room === room
    btn.classList.toggle('is-active', isActive)
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
  })
}

function sendMessage(event) {
  event.preventDefault()

  const text = messageInput.value.trim()

  if (!text || !socket?.connected) return

  socket.emit('chat:message', {
    user: usernameInput.value.trim() || 'Gjest',
    text,
    room: currentRoom,
  })

  messageInput.value = ''
  messageInput.focus()
}

function renderMessages() {
  const list = ensureRoom(currentRoom)
  messagesContainer.innerHTML = ''

  list.forEach((msg) => {
    const messageEl = document.createElement('article')
    messageEl.className = 'message'

    const time = formatTime(msg.timestamp)

    messageEl.innerHTML = `
      <header class="message__meta">
        <span class="message__user">${escapeHtml(msg.user)}</span>
        <span class="message__time">${time}</span>
      </header>
      <p class="message__text">${escapeHtml(msg.text)}</p>
    `

    messagesContainer.appendChild(messageEl)
  })

  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function formatTime(timestamp) {
  if (!timestamp) return '—'

  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

usernameInput.addEventListener('change', (event) => {
  username = event.target.value || username
})

messageForm.addEventListener('submit', sendMessage)

roomSwitcher.addEventListener('click', (event) => {
  const button = event.target.closest('.switcher__tab')
  if (!button) return
  const room = button.dataset.room
  if (room && room !== currentRoom) {
    joinRoom(room)
  }
})

initSocket()
