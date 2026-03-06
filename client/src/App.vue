<script setup>
import { ref, onMounted } from 'vue'
import { socket } from './socket.js'
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

socket.on('room_created', ({ code, seat, state }) => {
  myRoomCode.value = code
  mySeat.value = seat
  roomState.value = state
  view.value = 'waiting'
  error.value = null
})

socket.on('room_joined', ({ seat, state }) => {
  mySeat.value = seat
  roomState.value = state
  myRoomCode.value = state.code
  view.value = 'waiting'
  error.value = null
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
  setTimeout(() => { issueToast.value = null }, 5000)
})

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

    <!-- Issue reported toast -->
    <Transition name="toast-fade">
      <div v-if="issueToast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] bg-green-700 text-white text-sm rounded-lg px-4 py-2 shadow-lg">
        Issue #{{ issueToast.issueNumber }} created
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
