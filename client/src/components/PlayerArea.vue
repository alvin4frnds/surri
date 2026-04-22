<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  seat: { type: Number, required: true },
  seatData: { type: Object, default: null },
  tricks: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  isDealer: { type: Boolean, default: false },
  dealerScore: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
  position: { type: String, required: true }, // 'south' | 'north' | 'west' | 'east'
  isSouth: { type: Boolean, default: false },
  supportSignal: { type: String, default: null },
  bidAction: { type: String, default: null },
  teamTricksWon: { type: Number, default: 0 },
  teamTricksNeeded: { type: Number, default: 0 },
  isMyTeam: { type: Boolean, default: false },
  showTrickCircles: { type: Boolean, default: true },
  showScoreBadge: { type: Boolean, default: false },
})

// Bot chat bubble — persist until value changes to null/different
const showBubble = ref(false)

watch(() => props.bidAction, (val, oldVal) => {
  if (val && !props.isSouth) {
    showBubble.value = true
  } else if (!val) {
    showBubble.value = false
  }
})

// Also show support signals as bubbles for non-south
const showSupportBubble = ref(false)

watch(() => props.supportSignal, (val, oldVal) => {
  if (val && !props.isSouth) {
    showSupportBubble.value = true
  } else if (!val) {
    showSupportBubble.value = false
  }
})

const isVerticalStack = props.position === 'west' || props.position === 'east'
</script>

<template>
  <div class="flex flex-col items-center gap-1 relative">
    <!-- Card backs (opponents) - stacked -->
    <div v-if="!isSouth && cardCount > 0 && !isVerticalStack" class="relative mb-1" :style="`height: 28px; width: ${20 + Math.min(cardCount, 13) * 6}px`">
      <div
        v-for="i in Math.min(cardCount, 13)"
        :key="i"
        class="absolute top-0 w-5 h-7 rounded-sm card-back-mini"
        :style="`left: ${(i-1) * 6}px; z-index: ${i}`"
      />
    </div>
    <div v-if="!isSouth && cardCount > 0 && isVerticalStack" class="relative mb-1" :style="`height: ${20 + Math.min(cardCount, 13) * 4}px; width: 28px`">
      <div
        v-for="i in Math.min(cardCount, 13)"
        :key="i"
        class="absolute left-0 w-7 h-5 rounded-sm card-back-mini"
        :style="`top: ${(i-1) * 4}px; z-index: ${i}`"
      />
    </div>

    <!-- Chat bubble for bots (bid action) -->
    <Transition name="bubble">
      <div
        v-if="showBubble && bidAction && !isSouth"
        class="absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-slate-900 rounded-xl px-3 py-1 text-xs font-medium shadow-lg whitespace-nowrap z-30"
      >
        {{ bidAction }}
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
      </div>
    </Transition>

    <!-- Chat bubble for support signal -->
    <Transition name="bubble">
      <div
        v-if="showSupportBubble && supportSignal && !isSouth"
        class="absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-slate-900 rounded-xl px-3 py-1 text-xs font-medium shadow-lg whitespace-nowrap z-30"
      >
        {{ supportSignal }}
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
      </div>
    </Transition>

    <!-- Player info box -->
    <div
      class="border rounded-xl px-3 py-2 text-center min-w-[72px]"
      :class="[
        isActive ? 'ring-2 ring-[var(--app-dealer)]' : '',
        isDealer ? 'bg-[var(--app-danger)]/20 border-[var(--app-danger)]/50' : 'bg-[var(--app-surface)] border-[var(--app-rule)]',
        !seatData?.isConnected && !seatData?.isTempBot && seatData ? 'opacity-50' : '',
      ]"
    >
      <!-- Name row -->
      <div class="flex items-center justify-center gap-1">
        <span v-if="seatData?.isTempBot" class="text-sm" title="Player disconnected — bot filling in">🤖📡</span>
        <span v-else-if="seatData?.isBot" class="text-sm">🤖</span>
        <span v-else-if="!seatData?.isConnected && seatData" class="text-sm">🤖</span>
        <span v-else class="text-sm">👤</span>

        <span class="text-xs font-medium text-[var(--app-ink)] truncate max-w-[60px]">
          {{ seatData?.name || '...' }}
        </span>

        <span v-if="isSouth" class="text-[var(--app-accent)] text-xs">(you)</span>
        <span v-if="isDealer" class="text-[var(--app-dealer)] text-xs">👑</span>
      </div>

      <!-- Dealer score (shown on dealer OR when showScoreBadge is set) -->
      <div v-if="isDealer || showScoreBadge" class="text-xs text-[var(--app-dealer)] font-bold mt-0.5 app-num">
        Score: {{ dealerScore }}
      </div>

      <!-- Trick circles -->
      <div v-if="showTrickCircles && teamTricksNeeded > 0" class="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[80px]">
        <div
          v-for="i in teamTricksNeeded"
          :key="i"
          class="w-2.5 h-2.5 rounded-full border"
          :class="i <= teamTricksWon
            ? (isMyTeam ? 'bg-[var(--app-team-self)] border-[var(--app-team-self)]' : 'bg-[var(--app-team-foe)] border-[var(--app-team-foe)]')
            : 'bg-transparent border-[var(--app-muted)]'"
        />
      </div>

      <!-- Losses -->
      <div v-if="losses > 0" class="mt-1">
        <span class="bg-[var(--app-danger)] text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
          {{ losses }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-back-mini {
  background: linear-gradient(145deg, #1a3a5c, #0d2440);
  border: 1.5px solid #c9a84c;
}
.bubble-enter-active {
  animation: bubbleIn 0.3s ease-out;
}
.bubble-leave-active {
  animation: bubbleOut 0.5s ease-in;
}
@keyframes bubbleIn {
  from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.8); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes bubbleOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
