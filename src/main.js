import { io } from 'socket.io-client' // подключаем клиент Socket.IO
import './styles/index.scss' // подключаем стили приложения

const $ = (id) => document.getElementById(id) // короткая функция для поиска элемента по id
const statusEl = $('status') // блок со статусом подключения
const statusText = statusEl?.querySelector('.status__text') // текстовая часть статуса
const form = $('messageForm') // форма отправки сообщения
const messageInput = $('messageInput') // поле ввода сообщения
const sendButton = $('sendButton') // кнопка отправки
const usernameInput = $('usernameInput') // поле ввода имени
const messages = $('messagesContainer') // контейнер для всех сообщений

// Room state: labels, current room and per-room histories
const ROOM_LABELS = { general: 'Generell', team: 'Team' }
let currentRoom = 'general'
const rooms = new Map()
const ensure = (r) => { if (!rooms.has(r)) rooms.set(r, []); return rooms.get(r) }
const activeRoomLabel = document.getElementById('activeRoomLabel')

// Set active room and render its history
function setRoom(r) {
  if (!r || r === currentRoom) return
  currentRoom = r
  document.querySelectorAll('.switcher__tab').forEach(t => t.classList.toggle('is-active', t.dataset.room === r))
  if (activeRoomLabel) activeRoomLabel.textContent = ROOM_LABELS[r] || r
  renderHistory()
  socket.emit('chat:join', { room: r })
}

function renderHistory() {
  const list = ensure(currentRoom)
  showHistory(list)
}

// Room switcher click handler (delegation)
document.getElementById('roomSwitcher')?.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.switcher__tab')
  if (!btn) return
  setRoom(btn.dataset.room)
})

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001' // адрес сокет-сервера
let connected = false // флаг, подключён ли клиент сейчас

const setStatus = (state, text) => { // обновляем визуальный статус
  if (!statusEl || !statusText) return // если элементов нет — выходим
  statusEl.className = `status status--${state}` // ставим класс по состоянию
  statusText.textContent = text // обновляем текст статуса
}

const toggleSendButton = () => { // включаем/выключаем кнопку
  if (!sendButton || !messageInput) return // если элементов нет — выходим
  sendButton.disabled = !connected || !messageInput.value.trim() // выключаем, если нет связи или текста
}


const addMessage = ({ user, text, timestamp }) => {
  if (!messages) return;
  const item = document.createElement('article');
  item.className = 'message';
  // шаблон без лишнего текста перед разметкой
  item.innerHTML = `
    <div class="message__meta">
      <span class="message__user">${user || 'Guest'}</span>
      <time>${new Date(timestamp || Date.now()).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</time>
    </div>
    <p class="message__text"></p>
  `;
  item.querySelector('.message__text').textContent = text || '';
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

const showHistory = (list) => { // полностью перерисовываем историю
  if (!messages) return // если контейнера нет — выходим
  messages.innerHTML = '' // очищаем старый список
  list.forEach(addMessage) // добавляем каждое сообщение
}

const socket = io(SOCKET_URL) // создаём подключение к сокету

setStatus('connecting', 'kobler til...') // показываем, что идёт подключение
toggleSendButton() // обновляем состояние кнопки

socket.on('connect', () => { // когда подключились
  connected = true // ставим флаг подключения
  setStatus('connected', 'tilkoblet') // обновляем статус
  toggleSendButton() // включаем кнопку, если есть текст
})

socket.on('disconnect', () => { // когда отключились
  connected = false // снимаем флаг подключения
  setStatus('error', 'frakoblet') // показываем статус ошибки
  toggleSendButton() // блокируем кнопку
})

socket.on('connect_error', () => { // если не удалось подключиться
  connected = false // снимаем флаг
  setStatus('error', 'feil ved tilkobling') // пишем об ошибке
  toggleSendButton() // блокируем кнопку
})

socket.on('reconnect_attempt', () => { // при попытке переподключения
  setStatus('connecting', 'kobler til på nytt...') // показываем сообщение
})

// Сервер присылает историю за конкретную комнату
socket.on('chat:history', (payload = {}) => {
  const r = payload.room || 'general'
  const list = Array.isArray(payload.history) ? payload.history : (Array.isArray(payload) ? payload : [])
  rooms.set(r, list)
  if (r === currentRoom) renderHistory()
})

// Новое сообщение от сервера — сохраняем и рендерим если нужно
socket.on('chat:message', (msg = {}) => {
  const r = msg.room || 'general'
  ensure(r).push(msg)
  if (r === currentRoom) addMessage(msg)
})

messageInput?.addEventListener('input', toggleSendButton) // при вводе текста обновляем кнопку

form?.addEventListener('submit', (event) => { // обработка отправки формы
  event.preventDefault() // блокируем перезагрузку страницы
  if (!connected || !messageInput) return // если нет связи или поля — выходим

  const text = messageInput.value.trim() // берём текст и обрезаем пробелы
  if (!text) return // пустые строки не отправляем

  socket.emit('chat:message', { // отправляем событие на сервер
    user: usernameInput?.value.trim() || 'Guest', // имя или Guest
    text, // сам текст
    room: currentRoom, // отправляем в выбранный чат-ром
  })

  messageInput.value = '' // очищаем поле
  toggleSendButton() // обновляем кнопку
  messageInput.focus() // возвращаем фокус в поле
})
