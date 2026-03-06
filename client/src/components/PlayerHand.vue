<script setup>
import Card from './Card.vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  playableCards: { type: Array, default: () => [] },
  myTurn: { type: Boolean, default: false },
  label: { type: String, default: null },
  readOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['play-card'])

const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 }
const RANK_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }

function sorted(cards) {
  return [...cards].sort((a, b) => {
    const sA = a.slice(-1), sB = b.slice(-1)
    const rA = a.slice(0, -1), rB = b.slice(0, -1)
    if (SUIT_ORDER[sA] !== SUIT_ORDER[sB]) return SUIT_ORDER[sA] - SUIT_ORDER[sB]
    return RANK_ORDER[rA] - RANK_ORDER[rB]
  })
}

function isPlayable(card) {
  if (props.readOnly) return false
  if (!props.myTurn) return false
  return props.playableCards.includes(card)
}

function playCard(card) {
  if (isPlayable(card)) {
    emit('play-card', card)
  }
}
</script>

<template>
  <div class="px-2 py-2">
    <div v-if="label" class="text-xs text-slate-400 uppercase tracking-wider mb-1 px-1">{{ label }}</div>
    <div class="flex gap-1 overflow-x-auto pb-1">
      <Card
        v-for="card in sorted(cards)"
        :key="card"
        :card="card"
        :faceDown="false"
        :playable="isPlayable(card)"
        @click="playCard(card)"
      />
    </div>
  </div>
</template>
