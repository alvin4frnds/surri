<script setup>
import { onMounted } from 'vue'
import { logEvent } from '../services/analytics.js'

const props = defineProps({
  lastRoundResult: { type: Object, required: true },
  seats: { type: Array, default: () => [] },
  mySeat: { type: Number, default: null },
})

const emit = defineEmits(['play-again', 'leave'])

onMounted(() => {
  logEvent('game_end', { winner: winnerName() })
})

function winner() {
  return props.lastRoundResult?.winner
}

function winnerName() {
  const w = winner()
  if (w == null) return '?'
  return props.seats[w]?.name || `Seat ${w}`
}

function isLocalWinner() {
  return winner() === props.mySeat
}

function standings() {
  return props.seats.map((s, i) => ({
    seat: i,
    name: s?.name || `Seat ${i}`,
    losses: s?.losses ?? 0,
    isBot: s?.isBot ?? false,
  })).sort((a, b) => a.losses - b.losses)
}
</script>

<template>
  <div class="absolute inset-0 bg-[var(--app-bg)] z-50 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
    <!-- Celebration -->
    <div class="text-5xl mb-4">🏆</div>
    <div class="text-2xl font-bold text-[var(--app-dealer)] mb-2 tracking-wider app-num">WINNER</div>

    <div
      class="bg-[var(--app-surface)] border border-[var(--app-dealer)] rounded-2xl px-8 py-6 text-center mb-8"
      :class="isLocalWinner() ? 'ring-4 ring-[var(--app-dealer)]' : ''"
    >
      <div class="text-3xl font-bold text-[var(--app-ink)] mb-1">{{ winnerName() }}</div>
      <div class="text-[var(--app-muted)] text-sm">never lost!</div>
    </div>

    <!-- Standings -->
    <div class="w-full max-w-xs mb-8">
      <div class="text-xs text-[var(--app-muted)] text-center uppercase tracking-widest mb-3">Final Standings</div>
      <div class="space-y-2">
        <div
          v-for="player in standings()"
          :key="player.seat"
          class="flex items-center justify-between bg-[var(--app-surface)] rounded-xl px-4 py-2"
          :class="player.seat === winner() ? 'border border-[var(--app-dealer)]' : 'border border-[var(--app-rule)]'"
        >
          <div class="flex items-center gap-2">
            <span>{{ player.isBot ? '🤖' : '👤' }}</span>
            <span class="text-[var(--app-ink)] font-medium">{{ player.name }}</span>
            <span v-if="player.seat === props.mySeat" class="text-[var(--app-accent)] text-xs">(you)</span>
          </div>
          <span class="text-[var(--app-muted)] text-sm">
            {{ player.losses }} {{ player.losses === 1 ? 'loss' : 'losses' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Buttons -->
    <div class="w-full max-w-xs space-y-3">
      <button
        @click="emit('play-again')"
        class="w-full bg-[var(--app-accent)] hover:brightness-110 text-[var(--app-accent-ink)] font-bold rounded-lg py-3 transition-colors"
      >
        PLAY AGAIN
      </button>
      <button
        @click="emit('leave')"
        class="w-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold rounded-lg py-3 transition-colors border border-[var(--app-rule)]"
      >
        LEAVE ROOM
      </button>
    </div>
  </div>
</template>
