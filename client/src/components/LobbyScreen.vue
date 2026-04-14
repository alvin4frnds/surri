<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  error: { type: String, default: null },
})

const emit = defineEmits(['create-room', 'join-room'])

const playerName = ref('')
const roomCode = ref('')
const showBotSheet = ref(false)
const botCount = ref(2)
const codeError = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('surri_name')
  if (saved) playerName.value = saved
})

function saveName() {
  localStorage.setItem('surri_name', playerName.value)
}

function openCreateSheet() {
  if (!playerName.value.trim()) return
  saveName()
  showBotSheet.value = true
}

function confirmCreate() {
  emit('create-room', {
    name: playerName.value.trim(),
    botCount: botCount.value,
  })
  showBotSheet.value = false
}

function joinRoom() {
  if (!playerName.value.trim() || !roomCode.value.trim()) return
  saveName()
  codeError.value = false
  emit('join-room', {
    name: playerName.value.trim(),
    code: roomCode.value.trim().toUpperCase(),
  })
}

function onCodeKeydown(e) {
  if (e.key === 'Enter') joinRoom()
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center px-6 pt-14 pb-8 relative overflow-y-auto">
    <!-- Alpha banner -->
    <div class="absolute top-0 left-0 right-0 bg-amber-700/90 text-amber-100 text-xs font-bold text-center py-2 px-4">
      Alpha stage — bugs and hangs are expected. Please share feedback to help us improve!
    </div>

    <!-- Title -->
    <div class="mb-10 text-center">
      <div class="text-6xl font-bold tracking-[0.3em] text-slate-100 mb-2">SURRI</div>
      <div class="text-slate-400 text-sm tracking-widest">MULTIPLAYER CARD GAME</div>
    </div>

    <div class="w-full max-w-sm space-y-4">
      <!-- Name Input -->
      <input
        v-model="playerName"
        type="text"
        placeholder="Your Name"
        maxlength="20"
        class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
        @input="saveName"
      />

      <!-- Error -->
      <div v-if="error" class="text-red-400 text-sm text-center">{{ error }}</div>

      <!-- Create Room -->
      <button
        @click="openCreateSheet"
        :disabled="!playerName.trim()"
        class="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg px-4 py-3 transition-colors"
      >
        CREATE ROOM
      </button>

      <div class="text-center text-slate-500 text-sm">OR</div>

      <!-- Join Room -->
      <div class="flex gap-2">
        <input
          v-model="roomCode"
          type="text"
          inputmode="numeric"
          placeholder="Room Code"
          maxlength="5"
          class="flex-1 bg-slate-800 border rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none uppercase"
          :class="codeError ? 'border-red-500' : 'border-slate-600 focus:border-green-500'"
          @keydown="onCodeKeydown"
        />
        <button
          @click="joinRoom"
          :disabled="!playerName.trim() || !roomCode.trim()"
          class="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg px-5 py-3 transition-colors"
        >
          GO
        </button>
      </div>
    </div>

    <!-- Bot Count Bottom Sheet -->
    <Transition name="sheet">
      <div
        v-if="showBotSheet"
        class="fixed inset-0 bg-black/60 flex items-end z-50"
        @click.self="showBotSheet = false"
      >
        <div class="w-full bg-slate-800 border-t border-slate-600 rounded-t-2xl p-6 space-y-5">
          <h3 class="text-center font-semibold text-slate-200">Bots to fill seats</h3>

          <div class="flex justify-center gap-3">
            <button
              v-for="n in [0, 1, 2, 3]"
              :key="n"
              @click="botCount = n"
              class="w-14 h-14 rounded-xl font-bold text-lg transition-colors"
              :class="botCount === n
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            >
              {{ n }}
            </button>
          </div>

          <button
            @click="confirmCreate"
            class="w-full bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg px-4 py-3 transition-colors"
          >
            START ROOM
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.2s;
}
.sheet-enter-from, .sheet-leave-to {
  opacity: 0;
}
</style>
