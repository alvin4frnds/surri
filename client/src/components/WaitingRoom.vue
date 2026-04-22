<script setup>
const props = defineProps({
  roomState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['start-game', 'leave'])

function copyCode() {
  navigator.clipboard.writeText(props.roomState.code).catch(() => {})
}

function shareRoom() {
  const url = `${window.location.origin}/join/${props.roomState.code}`
  if (navigator.share) {
    navigator.share({
      title: 'Join my Surri game!',
      text: `Join my Surri game — Room ${props.roomState.code}`,
      url,
    }).catch(() => {})
  } else {
    navigator.clipboard.writeText(url).catch(() => {})
  }
}

function allSeatsReady() {
  if (!props.roomState) return false
  return props.roomState.seats.every(s => s.name !== null)
}

function isHost() {
  return props.roomState && props.roomState.hostSeat === props.mySeat
}

function seatIcon(seat) {
  if (!seat.name) return '·'
  if (seat.isBot) return '🤖'
  return '👤'
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center px-6 py-8 max-w-sm mx-auto">
    <!-- Back -->
    <div class="w-full flex items-center mb-6">
      <button @click="emit('leave')" class="text-[var(--app-muted)] hover:text-[var(--app-ink)] text-sm">
        ← Leave
      </button>
    </div>

    <!-- Room Code -->
    <div class="text-center mb-8">
      <div class="text-[var(--app-muted)] text-xs uppercase tracking-widest mb-2">ROOM CODE</div>
      <div class="flex items-center gap-3">
        <div class="bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-lg px-6 py-3 text-3xl font-bold tracking-[0.3em] text-[var(--app-ink)] app-num">
          {{ roomState.code }}
        </div>
        <button
          @click="copyCode"
          class="bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] text-sm rounded-lg px-3 py-2 transition-colors border border-[var(--app-rule)]"
        >
          Copy
        </button>
        <button
          @click="shareRoom"
          class="bg-[var(--app-accent-2)] hover:brightness-110 text-white text-sm rounded-lg px-3 py-2 transition-colors"
        >
          Share
        </button>
      </div>
    </div>

    <!-- Seats -->
    <div class="w-full space-y-3 mb-8">
      <div
        v-for="(seat, i) in roomState.seats"
        :key="i"
        class="flex items-center gap-3 bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-lg px-4 py-3"
      >
        <span class="text-xl">{{ seatIcon(seat) }}</span>
        <span v-if="seat.name" class="text-[var(--app-ink)] font-medium">
          {{ seat.name }}
          <span v-if="i === mySeat" class="text-[var(--app-accent)] text-xs ml-1">(you)</span>
        </span>
        <span v-else class="text-[var(--app-muted)] italic animate-pulse">Waiting…</span>
      </div>
    </div>

    <!-- Start / Waiting -->
    <div v-if="isHost()">
      <button
        @click="emit('start-game')"
        :disabled="!allSeatsReady()"
        class="w-full bg-[var(--app-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-accent-ink)] font-bold rounded-lg px-6 py-3 transition-colors"
      >
        START GAME ▶
      </button>
    </div>
    <div v-else class="text-[var(--app-muted)] text-center text-sm">
      Waiting for host to start…
    </div>
  </div>
</template>
