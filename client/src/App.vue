<script setup>
import { ref } from 'vue'
import { socket } from './socket.js'
import { logEvent, setUserId } from './services/analytics.js'
import LobbyScreen from './components/LobbyScreen.vue'
import WaitingRoom from './components/WaitingRoom.vue'
import GameBoard from './components/GameBoard.vue'
import HelpOverlay from './components/HelpOverlay.vue'

const roomState = ref(null)
const gameState = ref(null)
const mySeat = ref(null)
const myRoomCode = ref(null)
const view = ref('lobby')
const error = ref(null)
const disconnected = ref(false)
const joinCodeFromUrl = ref(null)

// Parse /join/CODE from URL for share links
const joinMatch = window.location.pathname.match(/^\/join\/(\w+)$/i)
if (joinMatch) {
  joinCodeFromUrl.value = joinMatch[1].toUpperCase()
  window.history.replaceState({}, '', '/')
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
  logEvent('room_created', { botCount: state.botCount ?? 0 })
})

socket.on('room_joined', ({ seat, state }) => {
  mySeat.value = seat
  roomState.value = state
  myRoomCode.value = state.code
  view.value = 'waiting'
  error.value = null
  setUserId(socket.id)
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
  roomState.value = null
  gameState.value = null
  mySeat.value = null
  myRoomCode.value = null
  view.value = 'lobby'
  error.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
    <div class="w-full max-w-[390px] h-[100dvh] max-h-[844px] relative overflow-hidden bg-[#0f1b2d] text-slate-200">
      <LobbyScreen
        v-if="view === 'lobby'"
        :error="error"
        :initialCode="joinCodeFromUrl"
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
        @game-action="onGameAction"
        @leave="onLeave"
      />
    </div>
    <HelpOverlay />

    <!-- Maintenance overlay on disconnect -->
    <Transition name="toast-fade">
      <div v-if="disconnected" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
        <div class="bg-[#1e293b] rounded-xl p-6 mx-4 text-center max-w-xs shadow-2xl border border-slate-600">
          <div class="text-3xl mb-3">&#9888;</div>
          <h2 class="text-lg font-bold text-white mb-2">Server Maintenance</h2>
          <p class="text-slate-300 text-sm">The server is undergoing maintenance. It will be back shortly.</p>
          <div class="mt-4 flex justify-center">
            <span class="inline-block w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Issue submitted overlay -->
    <Transition name="toast-fade">
      <div v-if="issueToast" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" @click="dismissIssueToast">
        <div class="bg-[#1e293b] rounded-xl p-6 mx-4 text-center max-w-xs shadow-2xl border border-slate-600" @click.stop>
          <div class="text-3xl mb-3">&#10004;</div>
          <h2 class="text-lg font-bold text-white mb-2">Issue Submitted!</h2>
          <p class="text-slate-300 text-sm mb-3">Thanks for letting us know! You can track it here:</p>
          <a href="https://github.com/alvin4frnds/surri/issues" target="_blank" class="text-blue-400 hover:text-blue-300 text-sm underline">github.com/alvin4frnds/surri/issues</a>
          <p class="text-slate-400 text-xs mt-3">We'll get to it as soon as we can!</p>
          <button @click="dismissIssueToast" class="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-6 py-2 transition-colors">Got it</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
