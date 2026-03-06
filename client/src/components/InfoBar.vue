<script setup>
const props = defineProps({
  trump: { type: String, default: null },
  dealerScore: { type: Number, default: 0 },
  dealer: { type: Number, default: null },
  seats: { type: Array, default: () => [] },
  bid: { type: Number, default: null },
  biddingSeat: { type: Number, default: null },
})

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
const RED_SUITS = ['H', 'D']

function trumpSymbol() {
  return props.trump ? SUITS[props.trump] : '?'
}

function trumpIsRed() {
  return RED_SUITS.includes(props.trump)
}

function dealerName() {
  if (props.dealer == null || !props.seats[props.dealer]) return ''
  return props.seats[props.dealer].name || 'Bot'
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
    <!-- Trump -->
    <div class="flex items-center gap-2">
      <span
        class="text-3xl font-bold"
        :class="trump ? (trumpIsRed() ? 'text-red-400' : 'text-white') : 'text-slate-500'"
      >
        {{ trumpSymbol() }}
      </span>
      <span class="text-xs text-slate-400 uppercase">Trump</span>
    </div>

    <!-- Dealer score -->
    <div class="text-center">
      <div class="text-xs text-slate-400 uppercase">Dealer Score</div>
      <div
        class="text-xl font-bold"
        :class="dealerScore >= 40 ? 'text-red-400' : 'text-slate-100'"
      >
        {{ dealerScore }}
      </div>
    </div>

    <!-- Dealer name -->
    <div class="text-right">
      <div class="text-xs text-slate-400 uppercase">Dealer</div>
      <div class="text-sm text-slate-200">{{ dealerName() }} 👑</div>
    </div>
  </div>
</template>
