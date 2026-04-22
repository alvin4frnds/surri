<script setup>
import { ref, onMounted } from 'vue'
import { useTheme } from '../theme.js'

const props = defineProps({
  error: { type: String, default: null },
  initialCode: { type: String, default: null },
})

const emit = defineEmits(['create-room', 'join-room'])

const { theme, THEMES, setTheme } = useTheme()

const playerName = ref('')
const roomCode = ref('')
const showBotSheet = ref(false)
const botCount = ref(2)
const codeError = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('surri_name')
  if (saved) playerName.value = saved
  if (props.initialCode) roomCode.value = props.initialCode
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
    <!-- Alpha banner (amber hard-coded — universal "this is beta" semantic) -->
    <div class="absolute top-0 left-0 right-0 bg-amber-700/90 text-amber-100 text-xs font-bold text-center py-2 px-4">
      Alpha stage — bugs and hangs are expected. Please share feedback to help us improve!
    </div>

    <!-- Title -->
    <div class="mb-10 text-center">
      <div class="text-6xl font-bold tracking-[0.3em] text-[var(--app-ink)] mb-2 app-num">SURRI</div>
      <div class="text-[var(--app-muted)] text-sm tracking-widest">MULTIPLAYER CARD GAME</div>
    </div>

    <div class="w-full max-w-sm space-y-4">
      <!-- Name Input -->
      <input
        v-model="playerName"
        type="text"
        placeholder="Your Name"
        maxlength="20"
        class="w-full bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-lg px-4 py-3 text-[var(--app-ink)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
        @input="saveName"
      />

      <!-- Theme switcher -->
      <div class="my-4">
        <div class="text-xs uppercase tracking-wider text-[var(--app-muted)] mb-2">
          Theme
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="t in THEMES"
            :key="t.id"
            type="button"
            @click="setTheme(t.id)"
            :aria-pressed="theme === t.id"
            :aria-label="`Use ${t.label} theme`"
            class="flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-[11px] text-[var(--app-ink)]"
            :class="theme === t.id
              ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]'
              : 'border-[var(--app-rule)]'"
          >
            <span class="w-6 h-6 rounded-full border border-white/10" :style="`background:${t.swatch}`"></span>
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="text-[var(--app-danger)] text-sm text-center">{{ error }}</div>

      <!-- Create Room -->
      <button
        @click="openCreateSheet"
        :disabled="!playerName.trim()"
        class="w-full bg-[var(--app-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-accent-ink)] font-bold rounded-lg px-4 py-3 transition-colors"
      >
        CREATE ROOM
      </button>

      <div class="text-center text-[var(--app-muted)] text-sm">OR</div>

      <!-- Join Room -->
      <div class="flex gap-2">
        <input
          v-model="roomCode"
          type="text"
          inputmode="numeric"
          placeholder="Room Code"
          maxlength="5"
          class="flex-1 bg-[var(--app-surface)] border rounded-lg px-4 py-3 text-[var(--app-ink)] placeholder-[var(--app-muted)] focus:outline-none uppercase"
          :class="codeError ? 'border-[var(--app-danger)]' : 'border-[var(--app-rule)] focus:border-[var(--app-accent)]'"
          @keydown="onCodeKeydown"
        />
        <button
          @click="joinRoom"
          :disabled="!playerName.trim() || !roomCode.trim()"
          class="bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-ink)] font-bold rounded-lg px-5 py-3 transition-colors border border-[var(--app-rule)]"
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
        <div class="w-full bg-[var(--app-surface)] border-t border-[var(--app-rule)] rounded-t-2xl p-6 space-y-5">
          <h3 class="text-center font-semibold text-[var(--app-ink)]">Bots to fill seats</h3>

          <div class="flex justify-center gap-3">
            <button
              v-for="n in [0, 1, 2, 3]"
              :key="n"
              @click="botCount = n"
              class="w-14 h-14 rounded-xl font-bold text-lg transition-colors"
              :class="botCount === n
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-ink)]'
                : 'bg-[var(--app-surface-2)] text-[var(--app-ink)] hover:brightness-125 border border-[var(--app-rule)]'"
            >
              {{ n }}
            </button>
          </div>

          <button
            @click="confirmCreate"
            class="w-full bg-[var(--app-accent)] hover:brightness-110 text-[var(--app-accent-ink)] font-bold rounded-lg px-4 py-3 transition-colors"
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
