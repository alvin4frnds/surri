<script setup>
const props = defineProps({
  card: { type: String, default: null },
  faceDown: { type: Boolean, default: false },
  playable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
  size: { type: String, default: null }, // 'sm' | 'md' | 'lg'
})

const emit = defineEmits(['click'])

const SUIT_NAMES = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }
const RANK_NAMES = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }

function rank() {
  if (!props.card) return ''
  return props.card.slice(0, -1)
}

function suit() {
  if (!props.card) return ''
  return props.card.slice(-1)
}

function cardImageUrl() {
  if (!props.card) return ''
  const r = rank()
  const s = suit()
  const rankName = RANK_NAMES[r] || r
  const suitName = SUIT_NAMES[s] || s
  return `/cards/${rankName}_of_${suitName}.png`
}

function sizeClass() {
  if (props.size === 'sm') return 'w-10 h-14'
  if (props.size === 'lg') return 'w-16 h-24'
  if (props.small) return 'w-10 h-14'
  return 'w-14 h-20' // md / default
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
    class="relative rounded-lg select-none transition-all overflow-hidden"
    :class="[
      sizeClass(),
      faceDown
        ? 'card-back cursor-default'
        : 'border border-slate-600',
      !faceDown && playable
        ? 'opacity-100 cursor-pointer card-playable'
        : '',
      !faceDown && !playable
        ? 'opacity-90 cursor-not-allowed'
        : '',
      selected ? 'ring-2 ring-yellow-400 -translate-y-2' : '',
    ]"
  >
    <!-- Face down pattern -->
    <div v-if="faceDown" class="absolute inset-0 card-back-inner rounded-lg" />

    <!-- Face up card image -->
    <img
      v-else-if="card"
      :src="cardImageUrl()"
      :alt="card"
      class="w-full h-full object-contain"
    />
  </div>
</template>

<style scoped>
.card-back {
  background: linear-gradient(145deg, #1a3a5c, #0d2440);
  border: 2px solid #c9a84c;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.card-back-inner {
  border: 1px solid #b8943f;
  margin: 3px;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(201,168,76,0.08) 4px, rgba(201,168,76,0.08) 5px),
    repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(201,168,76,0.08) 4px, rgba(201,168,76,0.08) 5px),
    linear-gradient(180deg, #162d4a, #0d2440);
}
.card-playable {
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
  border-color: #4ade80;
}
</style>
