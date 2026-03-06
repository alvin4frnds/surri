<script setup>
const props = defineProps({
  card: { type: String, default: null },
  faceDown: { type: Boolean, default: false },
  playable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
const RED_SUITS = ['H', 'D']

function rank() {
  if (!props.card) return ''
  return props.card.slice(0, -1)
}

function suit() {
  if (!props.card) return ''
  return props.card.slice(-1)
}

function suitSymbol() {
  return SUITS[suit()] || ''
}

function isRed() {
  return RED_SUITS.includes(suit())
}

function handleClick() {
  if (props.playable && !props.faceDown) {
    emit('click', props.card)
  }
}
</script>

<template>
  <div
    @click="handleClick"
    class="relative rounded-lg border select-none transition-all"
    :class="[
      small ? 'w-10 h-14 text-xs' : 'w-14 h-20 text-sm',
      faceDown
        ? 'bg-slate-700 border-slate-500 cursor-default'
        : 'bg-slate-800 border-slate-600',
      !faceDown && playable
        ? 'opacity-100 cursor-pointer hover:border-green-400 hover:-translate-y-1'
        : '',
      !faceDown && !playable
        ? 'opacity-40 cursor-not-allowed'
        : '',
      selected ? 'ring-2 ring-yellow-400 -translate-y-2' : '',
    ]"
  >
    <!-- Face down pattern -->
    <div v-if="faceDown" class="absolute inset-1 rounded border border-slate-600 opacity-30" />

    <!-- Face up card content -->
    <template v-else-if="card">
      <!-- Top rank -->
      <div
        class="absolute top-1 left-1 font-bold leading-none"
        :class="isRed() ? 'text-red-400' : 'text-white'"
        :style="small ? 'font-size: 0.6rem' : 'font-size: 0.7rem'"
      >
        {{ rank() }}
      </div>

      <!-- Center suit -->
      <div
        class="absolute inset-0 flex items-center justify-center font-bold"
        :class="isRed() ? 'text-red-400' : 'text-white'"
        :style="small ? 'font-size: 1.1rem' : 'font-size: 1.4rem'"
      >
        {{ suitSymbol() }}
      </div>

      <!-- Bottom rank (rotated) -->
      <div
        class="absolute bottom-1 right-1 font-bold leading-none rotate-180"
        :class="isRed() ? 'text-red-400' : 'text-white'"
        :style="small ? 'font-size: 0.6rem' : 'font-size: 0.7rem'"
      >
        {{ rank() }}
      </div>
    </template>
  </div>
</template>
