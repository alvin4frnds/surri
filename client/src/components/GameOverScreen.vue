<script setup>
const props = defineProps({
  lastRoundResult: { type: Object, required: true },
  seats: { type: Array, default: () => [] },
  mySeat: { type: Number, default: null },
})

const emit = defineEmits(['play-again', 'leave'])

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
  <div class="absolute inset-0 bg-[#0f1b2d] z-50 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
    <!-- Celebration -->
    <div class="text-5xl mb-4">🏆</div>
    <div class="text-2xl font-bold text-yellow-400 mb-2 tracking-wider">WINNER</div>

    <div
      class="bg-slate-800 border border-yellow-500 rounded-2xl px-8 py-6 text-center mb-8"
      :class="isLocalWinner() ? 'ring-4 ring-yellow-400' : ''"
    >
      <div class="text-3xl font-bold text-white mb-1">{{ winnerName() }}</div>
      <div class="text-slate-400 text-sm">never lost!</div>
    </div>

    <!-- Standings -->
    <div class="w-full max-w-xs mb-8">
      <div class="text-xs text-slate-500 text-center uppercase tracking-widest mb-3">Final Standings</div>
      <div class="space-y-2">
        <div
          v-for="player in standings()"
          :key="player.seat"
          class="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-2"
          :class="player.seat === winner() ? 'border border-yellow-500' : ''"
        >
          <div class="flex items-center gap-2">
            <span>{{ player.isBot ? '🤖' : '👤' }}</span>
            <span class="text-slate-200 font-medium">{{ player.name }}</span>
            <span v-if="player.seat === props.mySeat" class="text-green-400 text-xs">(you)</span>
          </div>
          <span class="text-slate-400 text-sm">
            {{ player.losses }} {{ player.losses === 1 ? 'loss' : 'losses' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Buttons -->
    <div class="w-full max-w-xs space-y-3">
      <button
        @click="emit('play-again')"
        class="w-full bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-3 transition-colors"
      >
        PLAY AGAIN
      </button>
      <button
        @click="emit('leave')"
        class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg py-3 transition-colors"
      >
        LEAVE ROOM
      </button>
    </div>
  </div>
</template>
