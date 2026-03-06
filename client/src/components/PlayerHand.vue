<script setup>
import { ref } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  playableCards: { type: Array, default: () => [] },
  myTurn: { type: Boolean, default: false },
  label: { type: String, default: null },
  readOnly: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['play-card'])

const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 }
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

const hoveredIndex = ref(-1)

function fanStyle(index, total) {
  if (total <= 0) return {}
  const maxAngle = Math.min(props.compact ? 35 : 50, total * (props.compact ? 2.8 : 4))
  const angle = total <= 1 ? 0 : -maxAngle / 2 + (index / (total - 1)) * maxAngle
  const radius = props.compact ? 600 : 700
  const radians = (angle * Math.PI) / 180
  const x = Math.sin(radians) * radius
  const y = -Math.cos(radians) * radius + radius

  const isHovered = hoveredIndex.value === index
  const liftY = isHovered ? -20 : 0

  return {
    transform: `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${(y + liftY).toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`,
    zIndex: isHovered ? 100 : index,
  }
}

const cardSize = () => props.compact ? 'md' : 'lg'
const containerHeight = () => props.compact ? '100px' : '155px'
</script>

<template>
  <div class="px-2 pb-2 pt-1">
    <div v-if="label" class="text-xs text-slate-400 uppercase tracking-wider mb-1 px-1 text-center">{{ label }}</div>
    <div class="relative w-full" :style="`height: ${containerHeight()};`">
      <div
        v-for="(card, index) in sorted(cards)"
        :key="card"
        class="absolute bottom-0 left-1/2 origin-bottom transition-all duration-150"
        :class="isPlayable(card) ? 'cursor-pointer' : ''"
        :style="fanStyle(index, sorted(cards).length)"
        @mouseenter="isPlayable(card) ? hoveredIndex = index : null"
        @mouseleave="hoveredIndex = -1"
        @click="playCard(card)"
      >
        <Card :card="card" :faceDown="false" :playable="isPlayable(card)" :size="cardSize()" />
      </div>
    </div>
  </div>
</template>
