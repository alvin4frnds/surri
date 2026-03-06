<script setup>
import { ref, computed } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['call-tram', 'close'])

const selectedCards = ref([])

const partnerSeat = computed(() => (props.mySeat + 2) % 4)
const isBidder = computed(() => props.gameState.biddingSeat === props.mySeat)
const bid = computed(() => props.gameState.bid ?? 0)
const tricks = computed(() => props.gameState.tricks ?? {})
const biddingTeam = computed(() => props.gameState.biddingTeam)
const myTeam = computed(() => props.mySeat % 2)

function teamTricks(team) {
  const seats = team === 0 ? [0, 2] : [1, 3]
  return (tricks.value[seats[0]] || 0) + (tricks.value[seats[1]] || 0)
}

const amBiddingTeam = computed(() => biddingTeam.value === myTeam.value)
const myTeamTricks = computed(() => teamTricks(myTeam.value))
const myTeamTarget = computed(() => {
  if (amBiddingTeam.value) return bid.value
  return 14 - bid.value
})
const needed = computed(() => Math.max(0, myTeamTarget.value - myTeamTricks.value))

const myHand = computed(() => props.gameState.myHand || [])
const partnerHand = computed(() => props.gameState.partnerHand || [])
const showPartner = computed(() => isBidder.value && bid.value >= 10)

function toggleCard(card) {
  const idx = selectedCards.value.indexOf(card)
  if (idx !== -1) {
    selectedCards.value.splice(idx, 1)
  } else if (selectedCards.value.length < needed.value) {
    selectedCards.value.push(card)
  }
}

function removeSlot(i) {
  selectedCards.value.splice(i, 1)
}

function isSelected(card) {
  return selectedCards.value.includes(card)
}

function claimTram() {
  emit('call-tram', { cards: [...selectedCards.value] })
}

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
</script>

<template>
  <div class="fixed inset-0 bg-black/80 z-40 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-600">
      <button @click="emit('close')" class="text-slate-400 hover:text-white text-xl font-bold">✕</button>
      <span class="font-bold text-slate-100">TRAM CLAIM</span>
      <div class="w-6" />
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <!-- Info -->
      <div class="bg-slate-800 border border-slate-600 rounded-xl p-4 text-sm text-slate-300 text-center">
        You need <span class="font-bold text-white">{{ needed }}</span> more trick{{ needed !== 1 ? 's' : '' }} to close.
        <br>Select {{ needed }} card{{ needed !== 1 ? 's' : '' }} in the order you'd play them.
      </div>

      <!-- Play order slots -->
      <div>
        <div class="text-xs text-slate-400 uppercase tracking-wider mb-2">Play Order</div>
        <div class="flex gap-2 flex-wrap">
          <div
            v-for="i in needed"
            :key="i"
            class="w-14 h-20 rounded-lg border-2 flex items-center justify-center"
            :class="selectedCards[i-1]
              ? 'border-green-500 bg-slate-800 cursor-pointer'
              : 'border-slate-600 bg-slate-900 border-dashed'"
            @click="selectedCards[i-1] ? removeSlot(i-1) : null"
          >
            <div v-if="selectedCards[i-1]" class="text-center">
              <div class="text-xs font-bold"
                :class="['H','D'].includes(selectedCards[i-1].slice(-1)) ? 'text-red-400' : 'text-white'"
              >
                {{ selectedCards[i-1].slice(0,-1) }}{{ {'S':'♠','H':'♥','D':'♦','C':'♣'}[selectedCards[i-1].slice(-1)] }}
              </div>
              <div class="text-xs text-slate-400 mt-1">tap to remove</div>
            </div>
            <span v-else class="text-slate-500 text-sm">+{{ i }}</span>
          </div>
        </div>
      </div>

      <!-- My hand -->
      <div>
        <div class="text-xs text-slate-400 uppercase tracking-wider mb-2">Your Hand</div>
        <div class="flex gap-1 flex-wrap">
          <div
            v-for="card in sorted(myHand)"
            :key="card"
            @click="toggleCard(card)"
            class="cursor-pointer transition-all"
            :class="isSelected(card) ? 'opacity-30' : 'opacity-100'"
          >
            <Card :card="card" :faceDown="false" :playable="!isSelected(card)" :selected="false" :small="true" />
          </div>
        </div>
      </div>

      <!-- Partner hand (bid >= 10, I'm bidder) -->
      <div v-if="showPartner && partnerHand.length">
        <div class="text-xs text-slate-400 uppercase tracking-wider mb-2">
          {{ gameState.seats?.[(mySeat+2)%4]?.name || 'Partner' }}'s Hand
        </div>
        <div class="flex gap-1 flex-wrap">
          <div
            v-for="card in sorted(partnerHand)"
            :key="card"
            @click="toggleCard(card)"
            class="cursor-pointer transition-all"
            :class="isSelected(card) ? 'opacity-30' : 'opacity-100'"
          >
            <Card :card="card" :faceDown="false" :playable="!isSelected(card)" :selected="false" :small="true" />
          </div>
        </div>
      </div>
    </div>

    <!-- Claim button -->
    <div class="px-4 py-4 bg-slate-900 border-t border-slate-700">
      <button
        @click="claimTram"
        :disabled="selectedCards.length < needed"
        class="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg py-3 transition-colors"
      >
        CLAIM TRAM ▶
      </button>
    </div>
  </div>
</template>
