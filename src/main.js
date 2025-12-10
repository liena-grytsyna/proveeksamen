import './styles/index.scss'
import './styles/App.scss'
import { io } from 'socket.io-client'

const fallbackSocketUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:3001'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? fallbackSocketUrl

let username = `Gjest-${Math.floor(Math.random() * 900 + 100)}`
let socket = null
let currentStatus = 'connecting'
let messages = []

const usernameInput = document.getElementById('usernameInput')
const messageInput = document.getElementById('messageInput')
const messageForm = document.getElementById('messageForm')
const sendButton = document.getElementById('sendButton')
const messagesContainer = document.getElementById('messagesContainer')
const statusElement = document.getElementById('status')
const statusText = statusElement.querySelector('.status__text')
const usernameField = usernameInput.closest('.field')

usernameInput.value = ''

const hasUsername = () => usernameInput.value.trim().length > 0

const refreshUiState = () => {
  const validName = hasUsername()
  const isConnected = currentStatus === 'connected'

  sendButton.disabled = !isConnected || !validName
  messageInput.placeholder = validName
    ? 'Skriv en melding...'
    : 'Skriv navnet ditt først'

  if (usernameField) {
    usernameField.classList.toggle('field--error', !validName)
  }
}

function initSocket() {
  socket = io(SOCKET_URL, {
    autoConnect: false,
  })

  socket.on('connect', () => {
    updateStatus('connected', 'tilkoblet')
  })

  socket.on('disconnect', () => {
    updateStatus('disconnected', 'frakoblet')
  })

  socket.on('connect_error', () => {
    updateStatus('error', 'feil')
  })

  socket.on('chat:history', ({ history = [] } = {}) => {
    messages = history
    renderMessages()
  })

  socket.on('chat:message', (incoming) => {
    messages.push(incoming)
    renderMessages()
  })

  updateStatus('connecting', 'kobler til...')
  socket.connect()
}

function updateStatus(status, text) {
  currentStatus = status
  statusElement.classList.remove(
    'status--connected',
    'status--disconnected',
    'status--error',
    'status--connecting',
  )
  statusElement.classList.add(`status--${status}`)
  statusText.textContent = text
  refreshUiState()
}

function sendMessage(event) {
  event.preventDefault()

  const text = messageInput.value.trim()
  const userValue = usernameInput.value.trim()

  if (!text || !socket?.connected || !userValue) {
    if (!userValue) {
      usernameInput.focus()
    }
    return
  }

  socket.emit('chat:message', {
    user: userValue,
    text,
  })

  messageInput.value = ''
  messageInput.focus()
}

function renderMessages() {
  messagesContainer.innerHTML = ''

  messages.forEach((msg) => {
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
  if (!timestamp) return '--:--'

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
  updateStatus(
    socket?.connected ? 'connected' : 'connecting',
    statusText.textContent,
  )
})

usernameInput.addEventListener('input', () => {
  updateStatus(
    socket?.connected ? 'connected' : 'connecting',
    statusText.textContent,
  )
})

messageForm.addEventListener('submit', sendMessage)

initSocket()
