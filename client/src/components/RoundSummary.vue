<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  lastRoundResult: { type: Object, required: true },
  seats: { type: Array, default: () => [] },
})

const emit = defineEmits(['continue'])

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }

let timer = null

onMounted(() => {
  timer = setTimeout(() => emit('continue'), 5000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function seatName(seat) {
  if (seat == null) return '?'
  return props.seats[seat]?.name || `Seat ${seat}`
}

function bidderTeamSeats() {
  const r = props.lastRoundResult
  if (!r) return []
  const team = r.biddingSeat % 2
  return team === 0 ? [0, 2] : [1, 3]
}

function defenderTeamSeats() {
  const r = props.lastRoundResult
  if (!r) return []
  const team = (r.biddingSeat + 1) % 2
  return team === 0 ? [0, 2] : [1, 3]
}

function bidderTeamNames() {
  return bidderTeamSeats().map(seatName).join(' + ')
}

function defenderTeamNames() {
  return defenderTeamSeats().map(seatName).join(' + ')
}

function defenseTarget() {
  return 14 - (props.lastRoundResult?.bid ?? 0)
}

function scorePrefix() {
  const d = props.lastRoundResult?.scoreDelta
  if (d == null) return ''
  return d >= 0 ? `+${d}` : `${d}`
}

function isBid13() {
  return props.lastRoundResult?.bid === 13
}

function loserSeat() {
  return props.lastRoundResult?.loser
}

function loserName() {
  return seatName(loserSeat())
}

function newDealerName() {
  return seatName(props.lastRoundResult?.newDealer)
}

function changeReason() {
  const r = props.lastRoundResult?.dealerChangeReason
  if (r === 'score_overflow') return 'Score reached 52'
  if (r === 'score_negative') return 'Score went negative'
  if (r === 'bid13') return 'Bid of 13'
  return ''
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/80 z-30 flex items-center justify-center p-4"
    @click="emit('continue')"
  >
    <div
      class="w-full max-w-sm bg-slate-800 border border-slate-600 rounded-2xl overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div class="bg-slate-700 px-4 py-3 text-center font-bold text-slate-100">
        <template v-if="isBid13()">⚡ BID OF 13</template>
        <template v-else>ROUND SUMMARY</template>
      </div>

      <div class="p-4 space-y-4">
        <!-- Bid info -->
        <div class="text-center">
          <span class="text-slate-300">{{ seatName(lastRoundResult.biddingSeat) }} bid </span>
          <span class="font-bold text-white text-lg">{{ lastRoundResult.bid }} {{ SUITS[lastRoundResult.trump] }}</span>
          <div v-if="isBid13()" class="text-yellow-400 font-bold mt-1">ALL OR NOTHING</div>
        </div>

        <!-- Tricks display -->
        <div class="space-y-2">
          <!-- Bidding team -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-300">{{ bidderTeamNames() }}</span>
            <span class="font-bold" :class="lastRoundResult.made ? 'text-green-400' : 'text-red-400'">
              {{ lastRoundResult.biddingTeamTricks }} / {{ lastRoundResult.bid }}
            </span>
          </div>

          <!-- Bidding team progress bar -->
          <div class="w-full bg-slate-700 rounded-full h-2">
            <div
              class="h-2 rounded-full"
              :class="lastRoundResult.made ? 'bg-green-500' : 'bg-red-500'"
              :style="`width: ${Math.min(100, (lastRoundResult.biddingTeamTricks / lastRoundResult.bid) * 100)}%`"
            />
          </div>

          <!-- Defending team -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-300">{{ defenderTeamNames() }}</span>
            <span class="font-bold text-slate-200">
              {{ lastRoundResult.defendingTeamTricks }} / {{ defenseTarget() }}
            </span>
          </div>

          <!-- Defending team progress bar -->
          <div class="w-full bg-slate-700 rounded-full h-2">
            <div
              class="h-2 rounded-full bg-orange-500"
              :style="`width: ${Math.min(100, (lastRoundResult.defendingTeamTricks / defenseTarget()) * 100)}%`"
            />
          </div>
        </div>

        <!-- Outcome -->
        <div class="text-center">
          <span
            class="text-xl font-bold"
            :class="lastRoundResult.made ? 'text-green-400' : 'text-red-400'"
          >
            {{ lastRoundResult.made ? '✓ BID MADE' : '✗ BID FAILED' }}
          </span>
        </div>

        <!-- Score change (non-bid13) -->
        <div v-if="!isBid13()" class="bg-slate-700 rounded-xl p-3 text-center">
          <div class="text-xs text-slate-400 uppercase tracking-wider mb-1">Score Change</div>
          <div class="text-2xl font-bold text-slate-100">
            {{ lastRoundResult.newScore - lastRoundResult.scoreDelta }}
            <span class="text-slate-400 mx-2">→</span>
            <span :class="lastRoundResult.newScore >= 40 ? 'text-red-400' : 'text-white'">
              {{ lastRoundResult.newScore }}
            </span>
          </div>
          <div class="text-sm mt-1" :class="lastRoundResult.scoreDelta >= 0 ? 'text-red-400' : 'text-green-400'">
            {{ scorePrefix() }}
          </div>
        </div>

        <!-- Dealer change -->
        <div v-if="lastRoundResult.dealerChanged" class="bg-slate-700 rounded-xl p-3 space-y-1">
          <div class="text-yellow-400 font-bold text-center text-sm">⚠ DEALER CHANGE</div>
          <div class="text-xs text-slate-300 text-center">{{ changeReason() }}</div>

          <div v-if="loserSeat() != null" class="text-center text-sm">
            <span class="text-red-400 font-bold">{{ loserName() }}</span>
            <span class="text-slate-300"> takes a loss</span>
          </div>

          <div v-if="isBid13()" class="text-center text-xs text-slate-400">Score resets to 0</div>

          <div class="text-center text-sm">
            <span class="text-slate-400">New dealer: </span>
            <span class="font-bold text-white">{{ newDealerName() }} 👑</span>
          </div>
        </div>

        <div v-else class="text-center text-xs text-slate-400">
          Dealer: {{ seatName(lastRoundResult.biddingSeat != null ? lastRoundResult.newDealer ?? lastRoundResult.biddingSeat : null) }}
        </div>
      </div>

      <!-- Continue button -->
      <div class="px-4 pb-4">
        <button
          @click="emit('continue')"
          class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg py-3 transition-colors"
        >
          NEXT ROUND ▶
        </button>
      </div>

      <!-- Auto dismiss hint -->
      <div class="text-center text-xs text-slate-600 pb-3">Tap anywhere to dismiss</div>
    </div>
  </div>
</template>
