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
      <button @click="emit('leave')" class="text-slate-400 hover:text-slate-200 text-sm">
        ← Leave
      </button>
    </div>

    <!-- Room Code -->
    <div class="text-center mb-8">
      <div class="text-slate-400 text-xs uppercase tracking-widest mb-2">ROOM CODE</div>
      <div class="flex items-center gap-3">
        <div class="bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 text-3xl font-bold tracking-[0.3em] text-slate-100">
          {{ roomState.code }}
        </div>
        <button
          @click="copyCode"
          class="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg px-3 py-2 transition-colors"
        >
          Copy
        </button>
        <button
          @click="shareRoom"
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg px-3 py-2 transition-colors"
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
        class="flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3"
      >
        <span class="text-xl">{{ seatIcon(seat) }}</span>
        <span v-if="seat.name" class="text-slate-100 font-medium">
          {{ seat.name }}
          <span v-if="i === mySeat" class="text-green-400 text-xs ml-1">(you)</span>
        </span>
        <span v-else class="text-slate-500 italic animate-pulse">Waiting…</span>
      </div>
    </div>

    <!-- Start / Waiting -->
    <div v-if="isHost()">
      <button
        @click="emit('start-game')"
        :disabled="!allSeatsReady()"
        class="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg px-6 py-3 transition-colors"
      >
        START GAME ▶
      </button>
    </div>
    <div v-else class="text-slate-400 text-center text-sm">
      Waiting for host to start…
    </div>
  </div>
</template>
