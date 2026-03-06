<script setup>
const props = defineProps({
  card: { type: String, default: null },
  faceDown: { type: Boolean, default: false },
  playable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
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

function handleClick() {
  if (props.playable && !props.faceDown) {
    emit('click', props.card)
  }
}
</script>

<template>
  <div
    @click="handleClick"
    class="relative rounded-lg border select-none transition-all overflow-hidden"
    :class="[
      small ? 'w-10 h-14' : 'w-14 h-20',
      faceDown
        ? 'bg-blue-900 border-blue-700 cursor-default'
        : 'border-slate-600',
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
    <div v-if="faceDown" class="absolute inset-1 rounded border border-blue-600 bg-blue-800 opacity-60" />

    <!-- Face up card image -->
    <img
      v-else-if="card"
      :src="cardImageUrl()"
      :alt="card"
      class="w-full h-full object-contain"
    />
  </div>
</template>
