<script setup>
import { ref, onMounted } from 'vue'
import { socket, connection } from './socket.js'
import { logEvent, setUserId } from './services/analytics.js'
import { onNeedRefresh, onOfflineReady, applyUpdate } from './services/sw-update.js'
import LobbyScreen from './components/LobbyScreen.vue'
import WaitingRoom from './components/WaitingRoom.vue'
import GameBoard from './components/GameBoard.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import UpdateBanner from './components/UpdateBanner.vue'

// Feature flag: non-technical users should not see "New version — Reload"
// strips. Default off; set VITE_SHOW_UPDATE_BANNER=true at build time
// to enable for power users. When off, the new SW still activates — it
// just waits for the user to reload naturally.
const showUpdateBanner = import.meta.env.VITE_SHOW_UPDATE_BANNER === 'true'
const hasUpdate = ref(false)

onMounted(() => {
  if (showUpdateBanner) {
    onNeedRefresh(() => { hasUpdate.value = true })
    onOfflineReady(() => { /* no-op: UI is intentionally quiet */ })
  }
})

function onReloadForUpdate() {
  applyUpdate()
}

const roomState = ref(null)
const gameState = ref(null)
const mySeat = ref(null)
const myRoomCode = ref(null)
const view = ref('lobby')
const error = ref(null)
const disconnected = ref(false)
const joinCodeFromUrl = ref(null)
const seatOffer = ref(null) // { seat } when a spectator is offered a seat

// Parse /r/CODE or legacy /join/CODE from URL for share links.
// Canonical form is /r/CODE; /join/CODE is kept for backwards compatibility
// and silently normalized to /r/CODE on landing.
const urlMatch = window.location.pathname.match(/^\/(?:r|join)\/(\w+)$/i)
if (urlMatch) {
  joinCodeFromUrl.value = urlMatch[1].toUpperCase()
  const canonical = `/r/${joinCodeFromUrl.value}`
  if (window.location.pathname !== canonical) {
    window.history.replaceState({}, '', canonical)
  }
}

function pushRoomUrl(code) {
  const target = code ? `/r/${code}` : '/'
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', target)
  }
}

socket.on('disconnect', () => {
  disconnected.value = true
})

socket.on('connect', () => {
  if (disconnected.value) {
    disconnected.value = false
    // Server restart wipes in-memory state — return to lobby
    if (view.value !== 'lobby') {
      roomState.value = null
      gameState.value = null
      mySeat.value = null
      myRoomCode.value = null
      view.value = 'lobby'
      error.value = 'Server was restarted. Please rejoin.'
    }
  }
})

// Auto-join from share link if name is saved
function tryAutoJoin() {
  if (!joinCodeFromUrl.value) return
  const savedName = localStorage.getItem('surri_name')
  if (savedName) {
    socket.emit('join_room', { name: savedName, code: joinCodeFromUrl.value })
    joinCodeFromUrl.value = null
  }
}
if (joinCodeFromUrl.value) {
  if (socket.connected) {
    tryAutoJoin()
  } else {
    socket.once('connect', tryAutoJoin)
  }
}

socket.on('room_created', ({ code, seat, state }) => {
  myRoomCode.value = code
  mySeat.value = seat
  roomState.value = state
  view.value = 'waiting'
  error.value = null
  setUserId(socket.id)
  pushRoomUrl(code)
  logEvent('room_created', { botCount: state.botCount ?? 0 })
})

socket.on('room_joined', ({ seat, state }) => {
  mySeat.value = seat
  roomState.value = state
  myRoomCode.value = state.code
  view.value = 'waiting'
  error.value = null
  setUserId(socket.id)
  pushRoomUrl(state.code)
  logEvent('room_joined')
})

socket.on('room_updated', ({ state }) => {
  roomState.value = state
})

socket.on('game_state', ({ state }) => {
  gameState.value = state
  if (view.value !== 'game') {
    view.value = 'game'
  }
})

// Spec-004: takeover of a bot seat while a game is in progress.
socket.on('takeover_success', ({ seat, roomCode, gameState: gs, roomState: rs }) => {
  mySeat.value = seat
  myRoomCode.value = roomCode
  roomState.value = rs
  gameState.value = gs
  view.value = 'game'
  error.value = null
  pushRoomUrl(roomCode)
  logEvent('takeover_seat', { seat })
})

// Spec-004: joined as a spectator because no seat was claimable.
socket.on('spectate_joined', ({ roomCode, roomState: rs, gameState: gs }) => {
  mySeat.value = null
  myRoomCode.value = roomCode
  roomState.value = rs
  gameState.value = gs
  view.value = 'game' // GameBoard with spectator prop handles the UI
  error.value = null
  pushRoomUrl(roomCode)
  logEvent('spectate_start')
})

// Spec-004: a seat just opened and we're next in line. GameBoard renders
// the confirmation modal; user taps to confirm → emits takeover_seat.
socket.on('spectator_seat_offer', ({ seat }) => {
  seatOffer.value = { seat }
})

// Spec-004: forgiving routing when client calls join_room instead of
// rejoin_room on a pending session.
socket.on('rejoin_available', () => {
  socket.emit('rejoin_room')
})

socket.on('error', ({ message }) => {
  error.value = message
})

const issueToast = ref(null)
socket.on('issue_reported', ({ issueNumber, url }) => {
  issueToast.value = { issueNumber, url }
  setTimeout(() => { issueToast.value = null }, 8000)
})

function dismissIssueToast() {
  issueToast.value = null
}

function onCreateRoom({ name, botCount }) {
  error.value = null
  socket.emit('create_room', { name, botCount })
}

function onJoinRoom({ name, code }) {
  error.value = null
  socket.emit('join_room', { name, code })
}

function onStartGame() {
  socket.emit('start_game', {})
  logEvent('game_start')
}

function onGameAction(event, payload) {
  socket.emit(event, payload)
}

function onLeave() {
  const wasSpectator = mySeat.value === null && myRoomCode.value != null
  if (wasSpectator) {
    socket.emit('leave_spectator')
  }
  roomState.value = null
  gameState.value = null
  mySeat.value = null
  myRoomCode.value = null
  seatOffer.value = null
  view.value = 'lobby'
  error.value = null
  pushRoomUrl(null)
}

function onAcceptSeatOffer({ seat }) {
  const savedName = localStorage.getItem('surri_name') || 'Guest'
  socket.emit('takeover_seat', { name: savedName, seat })
  seatOffer.value = null
}

function onDismissSeatOffer() {
  seatOffer.value = null
}

// Browser back/forward → sync URL into app state.
window.addEventListener('popstate', () => {
  const path = window.location.pathname
  if (path === '/') {
    if (myRoomCode.value) onLeave()
    return
  }
  const m = path.match(/^\/(?:r|join)\/(\w+)$/i)
  if (!m) return
  const code = m[1].toUpperCase()
  if (code !== myRoomCode.value) {
    // Navigated to a different room URL — leave current, attempt new.
    if (myRoomCode.value) onLeave()
    joinCodeFromUrl.value = code
    if (socket.connected) {
      tryAutoJoin()
    } else {
      socket.once('connect', tryAutoJoin)
    }
  }
})
</script>

<template>
  <div class="app-canvas min-h-screen flex items-center justify-center">
    <UpdateBanner
      v-if="showUpdateBanner && hasUpdate"
      @reload="onReloadForUpdate"
      @dismiss="hasUpdate = false"
    />
    <div class="w-full max-w-[390px] h-[100dvh] max-h-[844px] relative overflow-hidden bg-[var(--app-bg)] text-[var(--app-ink)]">
      <LobbyScreen
        v-if="view === 'lobby'"
        :error="error"
        :initialCode="joinCodeFromUrl"
        :offline="connection.state === 'offline' || connection.state === 'reconnecting'"
        @create-room="onCreateRoom"
        @join-room="onJoinRoom"
      />
      <WaitingRoom
        v-else-if="view === 'waiting'"
        :roomState="roomState"
        :mySeat="mySeat"
        @start-game="onStartGame"
        @leave="onLeave"
      />
      <GameBoard
        v-else-if="view === 'game'"
        :gameState="gameState"
        :mySeat="mySeat"
        :spectator="mySeat === null"
        :seatOffer="seatOffer"
        @game-action="onGameAction"
        @accept-seat-offer="onAcceptSeatOffer"
        @dismiss-seat-offer="onDismissSeatOffer"
        @leave="onLeave"
      />
    </div>
    <HelpOverlay />

    <!-- Maintenance overlay on disconnect -->
    <Transition name="toast-fade">
      <div v-if="disconnected" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
        <div class="bg-[var(--app-surface)] rounded-xl p-6 mx-4 text-center max-w-xs shadow-2xl border border-[var(--app-rule)]">
          <div class="text-3xl mb-3">&#9888;</div>
          <h2 class="text-lg font-bold text-[var(--app-ink)] mb-2">Server Maintenance</h2>
          <p class="text-[var(--app-muted)] text-sm">The server is undergoing maintenance. It will be back shortly.</p>
          <div class="mt-4 flex justify-center">
            <span class="inline-block w-5 h-5 border-2 border-[var(--app-muted)] border-t-[var(--app-ink)] rounded-full animate-spin"></span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Issue submitted overlay -->
    <Transition name="toast-fade">
      <div v-if="issueToast" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" @click="dismissIssueToast">
        <div class="bg-[var(--app-surface)] rounded-xl p-6 mx-4 text-center max-w-xs shadow-2xl border border-[var(--app-rule)]" @click.stop>
          <div class="text-3xl mb-3">&#10004;</div>
          <h2 class="text-lg font-bold text-[var(--app-ink)] mb-2">Issue Submitted!</h2>
          <p class="text-[var(--app-muted)] text-sm mb-3">Thanks for letting us know! You can track it here:</p>
          <a href="https://github.com/alvin4frnds/surri/issues" target="_blank" class="text-[var(--app-accent-2)] hover:brightness-125 text-sm underline">github.com/alvin4frnds/surri/issues</a>
          <p class="text-[var(--app-muted)] text-xs mt-3">We'll get to it as soon as we can!</p>
          <button @click="dismissIssueToast" class="mt-4 bg-[var(--app-accent-2)] hover:brightness-110 text-white text-sm font-medium rounded-lg px-6 py-2 transition-colors">Got it</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Edge-to-edge safe area support for Android 15+ */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
