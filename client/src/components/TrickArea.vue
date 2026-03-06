<script setup>
import Card from './Card.vue'

const props = defineProps({
  currentTrick: { type: Array, default: () => [] },
  mySeat: { type: Number, required: true },
})

function relativePosition(seat) {
  const delta = (seat - props.mySeat + 4) % 4
  return ['south', 'west', 'north', 'east'][delta]
}

function cardForPosition(pos) {
  if (!props.currentTrick) return null
  const entry = props.currentTrick.find(e => relativePosition(e.seat) === pos)
  return entry ? entry.card : null
}
</script>

<template>
  <!-- Diamond layout: North / West+East / South -->
  <div class="relative flex flex-col items-center gap-1">
    <!-- North -->
    <div class="flex justify-center">
      <Card :card="cardForPosition('north')" :faceDown="false" :playable="false" />
    </div>

    <!-- West + East row -->
    <div class="flex items-center gap-16">
      <Card :card="cardForPosition('west')" :faceDown="false" :playable="false" />
      <!-- Center spacer -->
      <div class="w-8 h-8" />
      <Card :card="cardForPosition('east')" :faceDown="false" :playable="false" />
    </div>

    <!-- South -->
    <div class="flex justify-center">
      <Card :card="cardForPosition('south')" :faceDown="false" :playable="false" />
    </div>
  </div>
</template>
