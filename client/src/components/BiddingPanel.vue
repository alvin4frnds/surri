<script setup>
import { ref, computed } from 'vue'
import PlayerHand from './PlayerHand.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['ask-support', 'give-support', 'place-bid', 'pass-bid', 'increase-bid', 'start-play', 'raise-bid', 'pass-raise'])

const SUITS = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }
const SUIT_KEYS = ['S', 'H', 'D', 'C']
const RED_SUITS = ['H', 'D']

const selectedSuit = ref(null)
const selectedBid = ref(null)

const phase = computed(() => props.gameState.phase)
const isMyTurn = computed(() => props.gameState.myTurn)
const activeSeat = computed(() => props.gameState.activeSeat)
const biddingSeat = computed(() => props.gameState.biddingSeat)
const bidHistory = computed(() => props.gameState.bidHistory || [])
const supportAsked = computed(() => props.gameState.supportAsked || {})
const supportSignals = computed(() => props.gameState.supportSignals || {})
const partnerSeat = computed(() => (props.mySeat + 2) % 4)
const seats = computed(() => props.gameState.seats || [])
const partnerHand = computed(() => props.gameState.partnerHand)
const currentBid = computed(() => props.gameState.bid)
// The revealed partner is always the bidder's partner (not necessarily our partner)
const revealedPartnerSeat = computed(() => biddingSeat.value != null ? (biddingSeat.value + 2) % 4 : null)

// Forced bid phase
const isForced = computed(() => phase.value === 'bidding_forced')
const isRaiseWindow = computed(() => phase.value === 'bidding_raise')
const currentTrump = computed(() => props.gameState.trump)
const minBid = computed(() => {
  if (isRaiseWindow.value) return (currentBid.value ?? 10) + 1
  return isForced.value ? 8 : 10
})

// Partner reveal bid picker
const revealBid = ref(null)
function revealBidValue() {
  return revealBid.value ?? currentBid.value ?? 10
}

function initRevealBid() {
  revealBid.value = currentBid.value
}

const pendingSupportRequest = computed(() => props.gameState.pendingSupportRequest)

// Check if partner asked for support and I need to respond right now
const partnerAskedMe = computed(() => {
  return pendingSupportRequest.value
    && pendingSupportRequest.value.asker === partnerSeat.value
    && supportSignals.value[props.mySeat] === null
})

// Am I the active seat only because of a pending support request (not my bidding turn)?
const isSupportResponseOnly = computed(() => {
  return isMyTurn.value && partnerAskedMe.value
})

// Check if I already asked partner
const iAskedPartner = computed(() => supportAsked.value[props.mySeat] === true)

function suitColor(s) {
  return RED_SUITS.includes(s) ? 'text-red-400' : 'text-white'
}

function askSupport() {
  emit('ask-support')
}

function giveSupport(signal) {
  emit('give-support', { signal })
}

function passBid() {
  emit('pass-bid')
}

function confirmBid() {
  if (!selectedSuit.value) return
  const effectiveBid = selectedBid.value ?? minBid.value
  if (isRaiseWindow.value) {
    emit('raise-bid', { bid: effectiveBid, trump: selectedSuit.value })
  } else {
    emit('place-bid', { bid: effectiveBid, trump: selectedSuit.value })
  }
}

function passRaise() {
  emit('pass-raise')
}

function decreaseBid() {
  if (selectedBid.value > minBid.value) selectedBid.value--
  else if (selectedBid.value == null) selectedBid.value = minBid.value
}

function increaseBid() {
  if (selectedBid.value == null) selectedBid.value = minBid.value
  else if (selectedBid.value < 13) selectedBid.value++
}

function decreaseRevealBid() {
  const cur = currentBid.value ?? 10
  if (revealBidValue() > cur) revealBid.value = revealBidValue() - 1
}

function increaseRevealBid() {
  if (revealBidValue() < 13) revealBid.value = revealBidValue() + 1
}

function startPlay() {
  const b = revealBidValue()
  if (b !== currentBid.value) {
    emit('increase-bid', { bid: b })
  }
  emit('start-play')
}

function partnerName() {
  const s = seats.value[partnerSeat.value]
  return s ? s.name : 'Partner'
}

function revealedPartnerName() {
  if (revealedPartnerSeat.value == null) return 'Partner'
  const s = seats.value[revealedPartnerSeat.value]
  return s ? s.name : 'Partner'
}

function bidderName() {
  if (biddingSeat.value == null) return '?'
  const s = seats.value[biddingSeat.value]
  return s ? s.name : '?'
}

function seatName(seat) {
  const s = seats.value[seat]
  return s ? s.name : `Seat ${seat}`
}

function historyLabel(entry) {
  if (entry.action === 'pass') return 'Pass'
  if (entry.action === 'pass_raise') return 'Pass raise'
  const sym = SUITS[entry.trump] || entry.trump
  if (entry.action === 'raise') return `⇧ ${entry.bid} ${sym}`
  return `Bid ${entry.bid} ${sym}`
}

// Init reveal bid when entering partner_reveal; default raise-window
// picker to the current trump (per spec resolved-decision).
import { watch } from 'vue'
watch(phase, (newPhase) => {
  if (newPhase === 'partner_reveal') {
    initRevealBid()
  }
  if (newPhase === 'bidding_raise' && isMyTurn.value) {
    selectedSuit.value = currentTrump.value
    selectedBid.value = minBid.value
  }
})
watch(isMyTurn, (mine) => {
  if (mine && isRaiseWindow.value) {
    if (!selectedSuit.value) selectedSuit.value = currentTrump.value
    if (selectedBid.value == null) selectedBid.value = minBid.value
  }
})
</script>

<template>
  <div class="bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-2xl overflow-hidden shadow-xl">
    <!-- Header -->
    <div class="bg-[var(--app-surface-2)] px-4 py-2.5 text-center">
      <span class="font-bold text-[var(--app-ink)] text-sm uppercase tracking-wider">
        {{ phase === 'partner_reveal' ? 'Partner Reveal'
           : phase === 'bidding_raise' ? 'Overbid'
           : isForced ? 'Forced Bid'
           : 'Bidding' }}
      </span>
    </div>

    <!-- PARTNER REVEAL PHASE (slim controls only — cards shown on north side) -->
    <div v-if="phase === 'partner_reveal'" class="p-3 space-y-3">
      <!-- Bidder controls -->
      <div v-if="biddingSeat === mySeat">
        <div class="text-center text-[var(--app-muted)] text-sm mb-2">
          You bid <span class="font-bold text-[var(--app-ink)] app-num">{{ currentBid }}</span> — increase bid?
        </div>

        <!-- Bid picker -->
        <div class="flex items-center justify-center gap-4 mb-3">
          <button
            @click="decreaseRevealBid"
            :disabled="revealBidValue() <= currentBid"
            class="w-9 h-9 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-30 text-[var(--app-ink)] font-bold text-lg flex items-center justify-center border border-[var(--app-rule)]"
          >&#x2039;</button>

          <span class="text-xl font-bold text-[var(--app-ink)] w-10 text-center app-num">{{ revealBidValue() }}</span>

          <button
            @click="increaseRevealBid"
            :disabled="revealBidValue() >= 13"
            class="w-9 h-9 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-30 text-[var(--app-ink)] font-bold text-lg flex items-center justify-center border border-[var(--app-rule)]"
          >&#x203A;</button>
        </div>

        <button
          @click="startPlay"
          class="w-full bg-[var(--app-accent)] hover:brightness-110 text-[var(--app-accent-ink)] font-bold rounded-lg py-2.5 transition-colors text-sm"
        >
          START &#x25B6;
        </button>
      </div>

      <!-- Non-bidder waiting -->
      <div v-else class="text-center text-[var(--app-muted)] text-sm py-1">
        Waiting for {{ bidderName() }} to start...
      </div>
    </div>

    <!-- RAISE WINDOW: another seat's turn -->
    <div v-else-if="phase === 'bidding_raise' && !isMyTurn" class="p-4">
      <div class="text-[var(--app-muted)] text-sm text-center mb-1">
        Current bid: <span class="font-bold text-[var(--app-ink)] app-num">{{ currentBid }}</span>
        <span :class="suitColor(currentTrump)">{{ SUITS[currentTrump] }}</span>
        by {{ bidderName() }}
      </div>
      <div class="text-[var(--app-muted)] text-xs text-center mb-3">
        Waiting for {{ seatName(activeSeat) }} to raise or pass…
      </div>

      <div class="flex flex-wrap gap-2 justify-center">
        <div
          v-for="(entry, i) in bidHistory"
          :key="i"
          class="text-xs bg-[var(--app-surface-2)] rounded-full px-3 py-1 border border-[var(--app-rule)]"
          :class="entry.action === 'pass' || entry.action === 'pass_raise' ? 'text-[var(--app-muted)]'
            : entry.action === 'raise' ? 'text-[var(--app-dealer)]'
            : 'text-[var(--app-success)]'"
        >
          {{ seatName(entry.seat) }}: {{ historyLabel(entry) }}
        </div>
      </div>
    </div>

    <!-- RAISE WINDOW: local player's turn (raise or pass) -->
    <div v-else-if="phase === 'bidding_raise' && isMyTurn" class="p-4 space-y-3">
      <div class="text-[var(--app-ink)] text-sm text-center font-medium">
        Raise or pass?
      </div>
      <div class="text-[var(--app-muted)] text-xs text-center">
        Current bid: <span class="font-bold text-[var(--app-ink)] app-num">{{ currentBid }}</span>
        <span :class="suitColor(currentTrump)">{{ SUITS[currentTrump] }}</span>
        by {{ bidderName() }}
      </div>

      <!-- Bid history -->
      <div class="flex flex-wrap gap-1 justify-center">
        <div
          v-for="(entry, i) in bidHistory"
          :key="i"
          class="text-xs bg-[var(--app-surface-2)] rounded-full px-2 py-0.5 border border-[var(--app-rule)]"
          :class="entry.action === 'pass' || entry.action === 'pass_raise' ? 'text-[var(--app-muted)]'
            : entry.action === 'raise' ? 'text-[var(--app-dealer)]'
            : 'text-[var(--app-success)]'"
        >
          {{ seatName(entry.seat) }}: {{ historyLabel(entry) }}
        </div>
      </div>

      <!-- Pass button -->
      <button
        @click="passRaise"
        class="w-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] text-sm font-medium rounded-lg py-2 transition-colors border border-[var(--app-rule)]"
      >
        Pass
      </button>

      <!-- OR RAISE divider -->
      <div class="flex items-center gap-3">
        <div class="flex-1 h-px bg-[var(--app-rule)]"></div>
        <span class="text-[var(--app-muted)] text-xs uppercase tracking-wider">or raise</span>
        <div class="flex-1 h-px bg-[var(--app-rule)]"></div>
      </div>

      <!-- Suit selector (default: current trump) -->
      <div class="flex gap-2 justify-center">
        <button
          v-for="s in SUIT_KEYS"
          :key="s"
          @click="selectedSuit = s"
          class="w-14 h-12 rounded-xl text-2xl font-bold transition-colors border-2"
          :class="[
            suitColor(s),
            selectedSuit === s
              ? 'bg-[var(--app-surface-2)] border-[var(--app-ink)]'
              : 'bg-[var(--app-surface)] border-[var(--app-rule)] hover:border-[var(--app-muted)]'
          ]"
        >
          {{ SUITS[s] }}
        </button>
      </div>

      <!-- Bid number picker -->
      <div class="flex items-center justify-center gap-4">
        <button
          @click="decreaseBid"
          class="w-10 h-10 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold text-xl flex items-center justify-center border border-[var(--app-rule)]"
        >&#x2039;</button>

        <span class="text-2xl font-bold text-[var(--app-ink)] w-20 text-center app-num">
          BID: {{ selectedBid ?? minBid }}
        </span>

        <button
          @click="increaseBid"
          class="w-10 h-10 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold text-xl flex items-center justify-center border border-[var(--app-rule)]"
        >&#x203A;</button>
      </div>

      <!-- Confirm -->
      <button
        @click="confirmBid"
        :disabled="!selectedSuit"
        class="w-full bg-[var(--app-dealer)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg py-3 transition-colors"
      >
        RAISE
        <span v-if="selectedSuit">
          to {{ selectedBid ?? minBid }} {{ SUITS[selectedSuit] }}
        </span>
      </button>
    </div>

    <!-- BIDDING PHASE: another player's turn -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && !isMyTurn" class="p-4">
      <div class="text-[var(--app-muted)] text-sm text-center mb-3">Bidding in progress...</div>

      <!-- Bid history bubbles -->
      <div class="flex flex-wrap gap-2 justify-center">
        <div
          v-for="(entry, i) in bidHistory"
          :key="i"
          class="text-xs bg-[var(--app-surface-2)] rounded-full px-3 py-1 border border-[var(--app-rule)]"
          :class="entry.action === 'pass' ? 'text-[var(--app-muted)]' : 'text-[var(--app-success)]'"
        >
          {{ seatName(entry.seat) }}: {{ historyLabel(entry) }}
        </div>
      </div>

      <!-- Support signal response (partner asked for my support) -->
      <div v-if="partnerAskedMe" class="mt-4 pt-3 border-t border-[var(--app-rule)]">
        <div class="text-[var(--app-muted)] text-sm text-center mb-3">{{ partnerName() }} asks for your support:</div>
        <div class="flex gap-2 justify-center">
          <button
            v-for="signal in ['Full', 'Major', 'Minor', 'Pass']"
            :key="signal"
            @click="giveSupport(signal)"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="signal === 'Full' ? 'bg-[var(--app-accent-2)] hover:brightness-110 text-white'
              : signal === 'Major' ? 'bg-[var(--app-accent)] hover:brightness-110 text-[var(--app-accent-ink)]'
              : signal === 'Minor' ? 'bg-[var(--app-dealer)] hover:brightness-110 text-white'
              : 'bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] border border-[var(--app-rule)]'"
          >
            {{ signal }}
          </button>
        </div>
      </div>
    </div>

    <!-- BIDDING PHASE: partner asked for support (I just need to respond) -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && isSupportResponseOnly" class="p-4">
      <div class="text-[var(--app-muted)] text-sm text-center mb-3">{{ partnerName() }} asks for your support:</div>
      <div class="flex gap-2 justify-center">
        <button
          v-for="signal in ['Full', 'Major', 'Minor', 'Pass']"
          :key="signal"
          @click="giveSupport(signal)"
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="signal === 'Major' ? 'bg-[var(--app-accent)] hover:brightness-110 text-[var(--app-accent-ink)]'
            : signal === 'Minor' ? 'bg-[var(--app-dealer)] hover:brightness-110 text-white'
            : 'bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] border border-[var(--app-rule)]'"
        >
          {{ signal }}
        </button>
      </div>
    </div>

    <!-- BIDDING PHASE: local player's turn -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && isMyTurn" class="p-4 space-y-3">
      <div class="text-[var(--app-ink)] text-sm text-center font-medium">Your turn to bid</div>

      <!-- Bid history -->
      <div class="flex flex-wrap gap-1 justify-center">
        <div
          v-for="(entry, i) in bidHistory"
          :key="i"
          class="text-xs bg-[var(--app-surface-2)] rounded-full px-2 py-0.5 border border-[var(--app-rule)]"
          :class="entry.action === 'pass' ? 'text-[var(--app-muted)]' : 'text-[var(--app-success)]'"
        >
          {{ seatName(entry.seat) }}: {{ historyLabel(entry) }}
        </div>
      </div>

      <!-- Ask Partner + Pass -->
      <div class="flex gap-2">
        <button
          v-if="!isForced"
          @click="askSupport"
          :disabled="iAskedPartner"
          class="flex-1 bg-[var(--app-accent-2)] hover:brightness-110 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          {{ iAskedPartner ? 'Asked' : 'Ask Partner' }}
        </button>
        <button
          @click="passBid"
          :disabled="isForced"
          class="flex-1 bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg py-2 transition-colors border border-[var(--app-rule)]"
          :class="isForced ? 'text-[var(--app-muted)]' : 'text-[var(--app-ink)]'"
        >
          {{ isForced ? 'Must Bid' : 'Pass' }}
        </button>
      </div>

      <!-- Support received display -->
      <div v-if="supportSignals[partnerSeat] != null" class="text-center text-xs">
        <span class="text-[var(--app-muted)]">{{ partnerName() }} says: </span>
        <span
          class="font-bold"
          :class="supportSignals[partnerSeat] === 'Full' ? 'text-[var(--app-accent-2)]'
            : supportSignals[partnerSeat] === 'Major' ? 'text-[var(--app-success)]'
            : supportSignals[partnerSeat] === 'Minor' ? 'text-[var(--app-dealer)]'
            : 'text-[var(--app-muted)]'"
        >
          {{ supportSignals[partnerSeat] }}
        </span>
      </div>

      <!-- OR BID divider -->
      <div class="flex items-center gap-3">
        <div class="flex-1 h-px bg-[var(--app-rule)]"></div>
        <span class="text-[var(--app-muted)] text-xs uppercase tracking-wider">or bid</span>
        <div class="flex-1 h-px bg-[var(--app-rule)]"></div>
      </div>

      <!-- Suit selector -->
      <div class="flex gap-2 justify-center">
        <button
          v-for="s in SUIT_KEYS"
          :key="s"
          @click="selectedSuit = s"
          class="w-14 h-12 rounded-xl text-2xl font-bold transition-colors border-2"
          :class="[
            suitColor(s),
            selectedSuit === s
              ? 'bg-[var(--app-surface-2)] border-[var(--app-ink)]'
              : 'bg-[var(--app-surface)] border-[var(--app-rule)] hover:border-[var(--app-muted)]'
          ]"
        >
          {{ SUITS[s] }}
        </button>
      </div>

      <!-- Bid number picker -->
      <div class="flex items-center justify-center gap-4">
        <button
          @click="decreaseBid"
          class="w-10 h-10 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold text-xl flex items-center justify-center border border-[var(--app-rule)]"
        >&#x2039;</button>

        <span class="text-2xl font-bold text-[var(--app-ink)] w-20 text-center app-num">
          BID: {{ selectedBid ?? minBid }}
        </span>

        <button
          @click="increaseBid"
          class="w-10 h-10 rounded-full bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] font-bold text-xl flex items-center justify-center border border-[var(--app-rule)]"
        >&#x203A;</button>
      </div>

      <!-- Confirm -->
      <button
        @click="confirmBid"
        :disabled="!selectedSuit"
        class="w-full bg-[var(--app-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-accent-ink)] font-bold rounded-lg py-3 transition-colors"
      >
        CONFIRM BID
        <span v-if="selectedSuit">
          {{ SUITS[selectedSuit] }}{{ selectedBid ?? minBid }}
        </span>
      </button>
    </div>
  </div>
</template>
