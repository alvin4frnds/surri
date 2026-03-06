<script setup>
import { ref } from 'vue'

const props = defineProps({
  lastRoundResult: { type: Object, required: true },
  seats: { type: Array, default: () => [] },
  tramResult: { type: Object, default: null },
  mySeat: { type: Number, default: 0 },
})

const emit = defineEmits(['continue'])

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }

// No auto-dismiss — wait for user to click NEXT ROUND

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

function tramCallerName() {
  if (!props.tramResult) return ''
  return seatName(props.tramResult.callerSeat)
}

function formatCard(card) {
  if (!card) return ''
  const suit = card.slice(-1)
  const rank = card.slice(0, -1)
  return `${rank}${SUITS[suit] || suit}`
}

// Did my team win this round?
function myTeamWon() {
  const r = props.lastRoundResult
  if (!r) return false
  const myTeam = props.mySeat % 2
  const bidderTeam = r.biddingSeat % 2
  const iAmBidder = myTeam === bidderTeam
  // If my team bid and made it, I won. If opponent bid and failed, I won.
  return iAmBidder ? r.made : !r.made
}
</script>

<template>
  <div
    class="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4"
    @click="emit('continue')"
  >
    <div
      class="w-full max-w-sm bg-slate-800 border border-slate-600 rounded-2xl overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div
        class="px-4 py-3 text-center font-bold"
        :class="isBid13() ? 'bg-slate-700 text-slate-100' : myTeamWon() ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'"
      >
        <template v-if="isBid13()">⚡ BID OF 13</template>
        <template v-else>{{ myTeamWon() ? 'ROUND WON' : 'ROUND LOST' }}</template>
      </div>

      <div class="p-4 space-y-4">
        <!-- TRAM result (if any) -->
        <div v-if="tramResult" class="bg-slate-700 rounded-xl p-3 space-y-2">
          <div class="text-center font-bold text-lg" :class="tramResult.valid ? 'text-green-400' : 'text-red-400'">
            {{ tramResult.valid ? '✓ TRAM SUCCESSFUL' : '✗ TRAM FAILED' }}
          </div>
          <div class="text-center text-sm text-slate-300">
            {{ tramCallerName() }} called TRAM
          </div>
          <div v-if="tramResult.cards && tramResult.cards.length > 0" class="text-center text-sm text-slate-200">
            Cards: {{ tramResult.cards.map(formatCard).join(', ') }}
          </div>
          <div v-if="!tramResult.valid && tramResult.failReason" class="text-center text-xs text-red-300">
            {{ tramResult.failReason }}
          </div>
        </div>

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
            :class="myTeamWon() ? 'text-green-400' : 'text-red-400'"
          >
            {{ myTeamWon() ? '✓ YOU WON' : '✗ YOU LOST' }}
          </span>
          <div class="text-xs text-slate-400 mt-0.5">
            {{ lastRoundResult.made ? 'Bid was made' : 'Bid failed' }}
          </div>
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
