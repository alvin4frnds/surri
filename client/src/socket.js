import { io } from 'socket.io-client'
import { reactive } from 'vue'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin)

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getOrCreatePlayerId() {
  let id = localStorage.getItem('surri_playerId')
  if (!id) {
    id = generateId()
    localStorage.setItem('surri_playerId', id)
  }
  return id
}

const playerId = getOrCreatePlayerId()

export const socket = io(SERVER_URL, {
  auth: { playerId }
})

export { playerId }

// Connection state — drives offline lobby UI (hide create/join buttons
// rather than disable them). No persistent badge; the lobby re-renders
// once the socket reconnects.
export const connection = reactive({ state: socket.connected ? 'online' : 'connecting' })
socket.on('connect', () => { connection.state = 'online' })
socket.on('disconnect', () => { connection.state = 'offline' })
socket.io.on('reconnect_attempt', () => { connection.state = 'reconnecting' })

// Expose for debugging/testing
window.__socket = socket
