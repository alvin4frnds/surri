<script setup>
import { ref } from 'vue'

const props = defineProps({
  lastRoundResult: { type: Object, required: true },
  seats: { type: Array, default: () => [] },
  tramResult: { type: Object, default: null },
  mySeat: { type: Number, default: 0 },
})

const emit = defineEmits(['continue', 'explain-loss'])

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

const RANK_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }
const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 }

function sortedFailHand() {
  const hand = props.tramResult?.failHand
  if (!hand || !hand.length) return []
  return [...hand].sort((a, b) => {
    const sa = SUIT_ORDER[a.slice(-1)] ?? 9
    const sb = SUIT_ORDER[b.slice(-1)] ?? 9
    if (sa !== sb) return sa - sb
    return (RANK_ORDER[b.slice(0, -1)] || 0) - (RANK_ORDER[a.slice(0, -1)] || 0)
  })
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
      class="w-full max-w-sm bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-2xl overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div
        class="px-4 py-3 text-center font-bold"
        :class="isBid13() ? 'bg-[var(--app-surface-2)] text-[var(--app-ink)]' : myTeamWon() ? 'bg-[var(--app-success)]/30 text-[var(--app-success)]' : 'bg-[var(--app-danger)]/30 text-[var(--app-danger)]'"
      >
        <template v-if="isBid13()">⚡ BID OF 13</template>
        <template v-else>{{ myTeamWon() ? 'ROUND WON' : 'ROUND LOST' }}</template>
      </div>

      <div class="p-4 space-y-4">
        <!-- TRAM result (if any) -->
        <div v-if="tramResult" class="bg-[var(--app-surface-2)] rounded-xl p-3 space-y-2">
          <div class="text-center font-bold text-lg" :class="tramResult.valid ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'">
            {{ tramResult.valid ? '✓ TRAM SUCCESSFUL' : '✗ TRAM FAILED' }}
          </div>
          <div class="text-center text-sm text-[var(--app-muted)]">
            {{ tramCallerName() }} called TRAM
          </div>
          <div v-if="tramResult.cards && tramResult.cards.length > 0" class="text-center text-sm text-[var(--app-ink)]">
            Cards: {{ tramResult.cards.map(formatCard).join(', ') }}
          </div>
          <div v-if="!tramResult.valid && tramResult.failReason" class="text-center text-xs text-[var(--app-danger)]">
            {{ tramResult.failReason }}
          </div>
          <div v-if="!tramResult.valid && tramResult.failHand && tramResult.failHand.length" class="text-center text-sm text-[var(--app-ink)]">
            <div class="text-xs text-[var(--app-muted)] mb-1">{{ seatName(tramResult.failSeat) }}'s hand:</div>
            {{ sortedFailHand().map(formatCard).join(', ') }}
          </div>
          <button
            v-if="!tramResult.valid"
            @click.stop="emit('explain-loss')"
            class="w-full bg-[var(--app-danger)] hover:brightness-110 text-white text-sm font-bold rounded-lg py-2 mt-2"
          >
            🔍 Explain Loss
          </button>
        </div>

        <!-- Bid info -->
        <div class="text-center">
          <span class="text-[var(--app-muted)]">{{ seatName(lastRoundResult.biddingSeat) }} bid </span>
          <span class="font-bold text-[var(--app-ink)] text-lg app-num">{{ lastRoundResult.bid }} {{ SUITS[lastRoundResult.trump] }}</span>
          <div v-if="isBid13()" class="text-[var(--app-dealer)] font-bold mt-1">ALL OR NOTHING</div>
        </div>

        <!-- Tricks display -->
        <div class="space-y-2">
          <!-- Bidding team -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--app-muted)]">{{ bidderTeamNames() }}</span>
            <span class="font-bold app-num" :class="lastRoundResult.made ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'">
              {{ lastRoundResult.biddingTeamTricks }} / {{ lastRoundResult.bid }}
            </span>
          </div>

          <!-- Bidding team progress bar -->
          <div class="w-full bg-[var(--app-surface-2)] rounded-full h-2">
            <div
              class="h-2 rounded-full"
              :class="lastRoundResult.made ? 'bg-[var(--app-success)]' : 'bg-[var(--app-danger)]'"
              :style="`width: ${Math.min(100, (lastRoundResult.biddingTeamTricks / lastRoundResult.bid) * 100)}%`"
            />
          </div>

          <!-- Defending team -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--app-muted)]">{{ defenderTeamNames() }}</span>
            <span class="font-bold text-[var(--app-ink)] app-num">
              {{ lastRoundResult.defendingTeamTricks }} / {{ defenseTarget() }}
            </span>
          </div>

          <!-- Defending team progress bar -->
          <div class="w-full bg-[var(--app-surface-2)] rounded-full h-2">
            <div
              class="h-2 rounded-full bg-[var(--app-dealer)]"
              :style="`width: ${Math.min(100, (lastRoundResult.defendingTeamTricks / defenseTarget()) * 100)}%`"
            />
          </div>
        </div>

        <!-- Outcome -->
        <div class="text-center">
          <span
            class="text-xl font-bold"
            :class="myTeamWon() ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'"
          >
            {{ myTeamWon() ? '✓ YOU WON' : '✗ YOU LOST' }}
          </span>
          <div class="text-xs text-[var(--app-muted)] mt-0.5">
            {{ lastRoundResult.made ? 'Bid was made' : 'Bid failed' }}
          </div>
        </div>

        <!-- Score change (non-bid13) -->
        <div v-if="!isBid13()" class="bg-[var(--app-surface-2)] rounded-xl p-3 text-center">
          <div class="text-xs text-[var(--app-muted)] uppercase tracking-wider mb-1">Score Change</div>
          <div class="text-2xl font-bold text-[var(--app-ink)] app-num">
            {{ lastRoundResult.newScore - lastRoundResult.scoreDelta }}
            <span class="text-[var(--app-muted)] mx-2">→</span>
            <span :class="lastRoundResult.newScore >= 40 ? 'text-[var(--app-danger)]' : 'text-[var(--app-ink)]'">
              {{ lastRoundResult.newScore }}
            </span>
          </div>
          <div class="text-sm mt-1 app-num" :class="lastRoundResult.scoreDelta >= 0 ? 'text-[var(--app-danger)]' : 'text-[var(--app-success)]'">
            {{ scorePrefix() }}
          </div>
        </div>

        <!-- Dealer change -->
        <div v-if="lastRoundResult.dealerChanged" class="bg-[var(--app-surface-2)] rounded-xl p-3 space-y-1">
          <div class="text-[var(--app-dealer)] font-bold text-center text-sm">⚠ DEALER CHANGE</div>
          <div class="text-xs text-[var(--app-muted)] text-center">{{ changeReason() }}</div>

          <div v-if="loserSeat() != null" class="text-center text-sm">
            <span class="text-[var(--app-danger)] font-bold">{{ loserName() }}</span>
            <span class="text-[var(--app-muted)]"> takes a loss</span>
          </div>

          <div v-if="isBid13()" class="text-center text-xs text-[var(--app-muted)]">Score resets to 0</div>

          <div class="text-center text-sm">
            <span class="text-[var(--app-muted)]">New dealer: </span>
            <span class="font-bold text-[var(--app-ink)]">{{ newDealerName() }} 👑</span>
          </div>
        </div>

        <div v-else class="text-center text-xs text-[var(--app-muted)]">
          Dealer: {{ seatName(lastRoundResult.biddingSeat != null ? lastRoundResult.newDealer ?? lastRoundResult.biddingSeat : null) }}
        </div>
      </div>

      <!-- Continue button -->
      <div class="px-4 pb-4">
        <button
          @click="emit('continue')"
          class="w-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold rounded-lg py-3 transition-colors border border-[var(--app-rule)]"
        >
          NEXT ROUND ▶
        </button>
      </div>

      <!-- Auto dismiss hint -->
      <div class="text-center text-xs text-[var(--app-muted)] pb-3 opacity-60">Tap anywhere to dismiss</div>
    </div>
  </div>
</template>
