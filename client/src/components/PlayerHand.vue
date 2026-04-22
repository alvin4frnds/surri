<script setup>
import { ref, computed, watch } from 'vue'
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

// True when it's my turn and only some (not all) cards are playable
const hasLimitedPlayable = computed(() => {
  if (props.readOnly || !props.myTurn) return false
  return props.playableCards.length > 0 && props.playableCards.length < props.cards.length
})

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
const selectedIndex = ref(-1)

watch(() => props.myTurn, () => {
  hoveredIndex.value = -1
  selectedIndex.value = -1
})

function onTouchCard(index, card) {
  if (!isPlayable(card)) return
  if (selectedIndex.value === index) {
    playCard(card)
    selectedIndex.value = -1
    hoveredIndex.value = -1
  } else {
    selectedIndex.value = index
    hoveredIndex.value = index
  }
}

function fanStyle(index, total, card) {
  if (total <= 0) return {}

  if (props.compact) {
    const spacing = 14
    const totalWidth = (total - 1) * spacing
    const x = -totalWidth / 2 + index * spacing
    const isActive = hoveredIndex.value === index || selectedIndex.value === index
    const liftY = isActive ? -18 : 0
    return {
      transform: `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${liftY}px)`,
      zIndex: isActive ? 100 : index,
    }
  }

  const spacing = 22
  const totalWidth = (total - 1) * spacing
  const x = -totalWidth / 2 + index * spacing
  const isActive = hoveredIndex.value === index || selectedIndex.value === index
  const playable = isPlayable(card)

  // When only some cards are playable, lift playable cards up prominently
  const short = window.innerHeight < 750
  let liftY = 0
  if (hasLimitedPlayable.value && playable) {
    liftY = isActive ? (short ? -28 : -36) : (short ? -20 : -28)
  } else if (isActive) {
    liftY = short ? -18 : -24
  }

  return {
    transform: `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${liftY}px)`,
    zIndex: hasLimitedPlayable.value && playable ? (isActive ? 100 : 50 + index) : (isActive ? 100 : index),
  }
}

function cardSizeFor(card) {
  if (props.compact) return 'md'
  // Show playable cards bigger when only a subset is playable
  if (hasLimitedPlayable.value && isPlayable(card)) return 'xl'
  return 'lg'
}

function containerHeight() {
  if (props.compact) return '80px'
  // Use smaller height on shorter screens
  return window.innerHeight < 750 ? '118px' : '136px'
}
</script>

<template>
  <div class="px-8 pb-3 pt-1">
    <div v-if="label" class="text-xs text-[var(--app-muted)] uppercase tracking-wider mb-1 px-1 text-center">{{ label }}</div>
    <div class="relative w-full" :style="`height: ${containerHeight()};`" @mouseleave="hoveredIndex = -1; selectedIndex = -1">
      <div
        v-for="(card, index) in sorted(cards)"
        :key="card"
        class="absolute bottom-0 left-1/2 origin-bottom transition-all duration-150"
        :class="isPlayable(card) ? 'cursor-pointer' : ''"
        :style="fanStyle(index, sorted(cards).length, card)"
        @touchstart.prevent="onTouchCard(index, card)"
        @mouseenter="isPlayable(card) ? hoveredIndex = index : null"
        @mouseleave="hoveredIndex = -1"
        @click="selectedIndex === -1 ? playCard(card) : null"
      >
        <Card :card="card" :faceDown="false" :playable="isPlayable(card)" :size="cardSizeFor(card)" />
      </div>
    </div>
  </div>
</template>
