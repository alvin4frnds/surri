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

const rotations = {
  north: 'rotate(-3deg)',
  south: 'rotate(2deg)',
  west: 'rotate(-5deg) translateX(4px)',
  east: 'rotate(4deg) translateX(-4px)',
}
</script>

<template>
  <!-- Tight cluster layout -->
  <div class="relative flex flex-col items-center" style="gap: 2px;">
    <!-- North -->
    <div class="flex justify-center h-20 w-14">
      <Transition name="card-deal">
        <Card v-if="cardForPosition('north')" :card="cardForPosition('north')" :faceDown="false" :playable="false" :style="`transform: ${rotations.north}`" :key="'n-' + cardForPosition('north')" />
      </Transition>
    </div>

    <!-- West + East row -->
    <div class="flex items-center" style="gap: 24px;">
      <div class="h-20 w-14 flex items-center justify-center">
        <Transition name="card-deal">
          <Card v-if="cardForPosition('west')" :card="cardForPosition('west')" :faceDown="false" :playable="false" :style="`transform: ${rotations.west}`" :key="'w-' + cardForPosition('west')" />
        </Transition>
      </div>
      <div class="h-20 w-14 flex items-center justify-center">
        <Transition name="card-deal">
          <Card v-if="cardForPosition('east')" :card="cardForPosition('east')" :faceDown="false" :playable="false" :style="`transform: ${rotations.east}`" :key="'e-' + cardForPosition('east')" />
        </Transition>
      </div>
    </div>

    <!-- South -->
    <div class="flex justify-center h-20 w-14" style="margin-top: -4px;">
      <Transition name="card-deal">
        <Card v-if="cardForPosition('south')" :card="cardForPosition('south')" :faceDown="false" :playable="false" :style="`transform: ${rotations.south}`" :key="'s-' + cardForPosition('south')" />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.card-deal-enter-active {
  animation: cardDeal 0.35s ease-out;
}
@keyframes cardDeal {
  from { opacity: 0; transform: scale(0.5) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
