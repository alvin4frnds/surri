<script setup>
import { ref, computed } from 'vue'
import PlayerHand from './PlayerHand.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['ask-support', 'give-support', 'place-bid', 'pass-bid', 'increase-bid', 'start-play'])

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
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

// Forced bid phase
const isForced = computed(() => phase.value === 'bidding_forced')
const minBid = computed(() => isForced.value ? 8 : 10)

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
  emit('place-bid', { bid: effectiveBid, trump: selectedSuit.value })
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
  // Can't go below current bid
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
  const sym = SUITS[entry.trump] || entry.trump
  return `Bid ${entry.bid} ${sym}`
}

// Init reveal bid when entering partner_reveal
import { watch } from 'vue'
watch(phase, (newPhase) => {
  if (newPhase === 'partner_reveal') {
    initRevealBid()
  }
})
</script>

<template>
  <div>
    <!-- PARTNER REVEAL PHASE -->
    <div v-if="phase === 'partner_reveal'" class="bg-slate-900/95 p-4 space-y-4">
      <!-- Partner hand display -->
      <div class="bg-slate-800 border border-slate-600 rounded-xl p-3" v-if="partnerHand">
        <div class="text-xs text-slate-400 uppercase tracking-wider mb-2">{{ partnerName() }}'s Hand</div>
        <PlayerHand :cards="partnerHand" :playableCards="[]" :myTurn="false" :readOnly="true" />
      </div>

      <!-- Bidder controls -->
      <div v-if="biddingSeat === mySeat">
        <div class="text-center text-slate-300 text-sm mb-3">
          You bid <span class="font-bold text-white">{{ currentBid }}</span> — increase bid?
        </div>

        <!-- Bid picker -->
        <div class="flex items-center justify-center gap-4 mb-4">
          <button
            @click="decreaseRevealBid"
            :disabled="revealBidValue() <= currentBid"
            class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-xl flex items-center justify-center"
          >‹</button>

          <span class="text-2xl font-bold text-white w-12 text-center">{{ revealBidValue() }}</span>

          <button
            @click="increaseRevealBid"
            :disabled="revealBidValue() >= 13"
            class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-xl flex items-center justify-center"
          >›</button>
        </div>

        <button
          @click="startPlay"
          class="w-full bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-3 transition-colors"
        >
          START ▶
        </button>
      </div>

      <!-- Non-bidder waiting -->
      <div v-else class="text-center text-slate-400 text-sm py-2">
        Waiting for {{ bidderName() }} to start…
      </div>
    </div>

    <!-- BIDDING PHASE: another player's turn -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && !isMyTurn">
      <div class="bg-slate-800/80 border-t border-slate-700 px-4 py-2">
        <div class="text-slate-400 text-sm text-center">Bidding in progress…</div>

        <!-- Bid history bubbles -->
        <div class="flex flex-wrap gap-2 mt-2 justify-center">
          <div
            v-for="(entry, i) in bidHistory"
            :key="i"
            class="text-xs bg-slate-700 rounded-full px-3 py-1"
            :class="entry.action === 'pass' ? 'text-slate-400' : 'text-green-300'"
          >
            {{ seatName(entry.seat) }}: {{ historyLabel(entry) }}
          </div>
        </div>
      </div>

      <!-- Support signal response (partner asked for my support) -->
      <div v-if="partnerAskedMe" class="bg-slate-800 border-t border-slate-600 px-4 py-3">
        <div class="text-slate-300 text-sm text-center mb-3">{{ partnerName() }} asks for your support:</div>
        <div class="flex gap-2 justify-center">
          <button
            v-for="signal in ['Major', 'Minor', 'Pass']"
            :key="signal"
            @click="giveSupport(signal)"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="signal === 'Major' ? 'bg-green-700 hover:bg-green-600 text-white'
              : signal === 'Minor' ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'"
          >
            {{ signal }}
          </button>
        </div>
      </div>
    </div>

    <!-- BIDDING PHASE: partner asked for support (I just need to respond) -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && isSupportResponseOnly">
      <div class="bg-slate-800 border-t border-slate-600 px-4 py-3">
        <div class="text-slate-300 text-sm text-center mb-3">{{ partnerName() }} asks for your support:</div>
        <div class="flex gap-2 justify-center">
          <button
            v-for="signal in ['Major', 'Minor', 'Pass']"
            :key="signal"
            @click="giveSupport(signal)"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="signal === 'Major' ? 'bg-green-700 hover:bg-green-600 text-white'
              : signal === 'Minor' ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'"
          >
            {{ signal }}
          </button>
        </div>
      </div>
    </div>

    <!-- BIDDING PHASE: local player's turn -->
    <div v-else-if="(phase === 'bidding' || phase === 'bidding_forced') && isMyTurn">
      <div class="bg-slate-800 border-t border-slate-600 px-4 py-3 space-y-3">
        <div class="text-slate-200 text-sm text-center font-medium">Your turn to bid</div>

        <!-- Bid history -->
        <div class="flex flex-wrap gap-1 justify-center">
          <div
            v-for="(entry, i) in bidHistory"
            :key="i"
            class="text-xs bg-slate-700 rounded-full px-2 py-0.5"
            :class="entry.action === 'pass' ? 'text-slate-400' : 'text-green-300'"
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
            class="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            {{ iAskedPartner ? 'Asked' : 'Ask Partner' }}
          </button>
          <button
            @click="passBid"
            :disabled="isForced"
            class="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg py-2 transition-colors"
            :class="isForced ? 'text-slate-500' : 'text-slate-200'"
          >
            {{ isForced ? 'Must Bid' : 'Pass' }}
          </button>
        </div>

        <!-- Support received display -->
        <div v-if="supportSignals[partnerSeat] != null" class="text-center text-xs">
          <span class="text-slate-400">{{ partnerName() }} says: </span>
          <span
            class="font-bold"
            :class="supportSignals[partnerSeat] === 'Major' ? 'text-green-400'
              : supportSignals[partnerSeat] === 'Minor' ? 'text-yellow-400'
              : 'text-slate-400'"
          >
            {{ supportSignals[partnerSeat] }}
          </span>
        </div>

        <!-- OR BID divider -->
        <div class="text-center text-slate-500 text-xs">─── OR BID ───</div>

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
                ? 'bg-slate-600 border-white'
                : 'bg-slate-800 border-slate-600 hover:border-slate-400'
            ]"
          >
            {{ SUITS[s] }}
          </button>
        </div>

        <!-- Bid number picker -->
        <div class="flex items-center justify-center gap-4">
          <button
            @click="decreaseBid"
            class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl flex items-center justify-center"
          >‹</button>

          <span class="text-2xl font-bold text-white w-20 text-center">
            BID: {{ selectedBid ?? minBid }}
          </span>

          <button
            @click="increaseBid"
            class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl flex items-center justify-center"
          >›</button>
        </div>

        <!-- Confirm -->
        <button
          @click="confirmBid"
          :disabled="!selectedSuit"
          class="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg py-3 transition-colors"
        >
          CONFIRM BID
          <span v-if="selectedSuit">
            {{ SUITS[selectedSuit] }}{{ selectedBid ?? minBid }}
          </span>
        </button>

      </div>
    </div>
  </div>
</template>
