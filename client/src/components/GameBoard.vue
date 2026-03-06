<script setup>
import { ref, computed } from 'vue'
import PlayerArea from './PlayerArea.vue'
import TrickArea from './TrickArea.vue'
import BiddingPanel from './BiddingPanel.vue'
import PlayerHand from './PlayerHand.vue'
import TramOverlay from './TramOverlay.vue'
import RoundSummary from './RoundSummary.vue'
import GameOverScreen from './GameOverScreen.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['game-action', 'leave'])

const showTram = ref(false)
const showRoundSummary = ref(false)

// Track if the scoring phase overlay was dismissed
import { watch } from 'vue'
watch(() => props.gameState?.phase, (newPhase, oldPhase) => {
  if (newPhase === 'scoring') {
    showRoundSummary.value = true
  } else if (newPhase !== 'scoring') {
    showRoundSummary.value = false
  }
})

// Relative position helper: delta from mySeat
function relPos(seat) {
  const delta = (seat - props.mySeat + 4) % 4
  return ['south', 'west', 'north', 'east'][delta]
}

// Get absolute seat for a relative position
function absSeat(pos) {
  const idx = ['south', 'west', 'north', 'east'].indexOf(pos)
  return (props.mySeat + idx) % 4
}

const gs = computed(() => props.gameState)
const phase = computed(() => gs.value?.phase)
const seats = computed(() => gs.value?.seats ?? [])
const tricks = computed(() => gs.value?.tricks ?? {})
const handSizes = computed(() => gs.value?.handSizes ?? {})
const myHand = computed(() => gs.value?.myHand ?? [])
const partnerHand = computed(() => gs.value?.partnerHand ?? null)
const playableCards = computed(() => gs.value?.playableCards ?? [])
const myTurn = computed(() => gs.value?.myTurn ?? false)
const activeSeat = computed(() => gs.value?.activeSeat)
const dealer = computed(() => gs.value?.dealer)
const dealerScore = computed(() => gs.value?.dealerScore ?? 0)
const trump = computed(() => gs.value?.trump)
const bid = computed(() => gs.value?.bid)
const biddingTeam = computed(() => gs.value?.biddingTeam)
const biddingSeat = computed(() => gs.value?.biddingSeat)
const supportSignals = computed(() => gs.value?.supportSignals ?? {})
const bidHistory = computed(() => gs.value?.bidHistory ?? [])
const lastRoundResult = computed(() => gs.value?.lastRoundResult)
const tramResult = computed(() => gs.value?.tramResult)

const isBidding = computed(() =>
  phase.value === 'bidding' || phase.value === 'bidding_forced' || phase.value === 'partner_reveal'
)
const isPlaying = computed(() => phase.value === 'playing')
const isScoring = computed(() => phase.value === 'scoring')
const isGameOver = computed(() => lastRoundResult.value?.gameOver === true)

// Partner seat
const partnerSeat = computed(() => (props.mySeat + 2) % 4)

// The revealed partner seat (bidder's partner, shown on north)
const revealedPartnerSeat = computed(() => biddingSeat.value != null ? (biddingSeat.value + 2) % 4 : null)

// Show partner hand on north side during partner_reveal or playing phase
const showPartnerOnNorth = computed(() => {
  if (!partnerHand.value || partnerHand.value.length === 0) return false
  return phase.value === 'partner_reveal' || isPlaying.value
})

// Is bidder with bid >= 10 controlling partner
const isBidderControlling = computed(() =>
  isPlaying.value && biddingSeat.value === props.mySeat && (bid.value ?? 0) >= 10
)

// Partner's turn during partner control — server signals this via playingForPartner
const isPartnersTurn = computed(() =>
  isBidderControlling.value && (gs.value?.playingForPartner === true)
)

// I am partner whose hand is revealed
const amRevealedPartner = computed(() =>
  isPlaying.value && biddingSeat.value != null && biddingSeat.value !== props.mySeat
  && partnerSeat.value === props.mySeat && (bid.value ?? 0) >= 10
  && biddingSeat.value === (props.mySeat + 2) % 4
)

// Support signals for bid history display
function seatSupportSignal(seat) {
  return supportSignals.value[seat] || null
}

function seatBidAction(seat) {
  const entry = bidHistory.value.find(e => e.seat === seat)
  if (!entry) return null
  if (entry.action === 'pass') return 'Pass'
  const SUITS = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }
  return `Bid ${entry.bid} ${SUITS[entry.trump] || ''}`
}

// Team trick computations
function teamTarget(seat) {
  if (bid.value == null || biddingTeam.value == null) return 0
  const seatTeam = seat % 2
  return seatTeam === biddingTeam.value ? bid.value : 14 - bid.value
}

function teamTricksWon(seat) {
  const seatTeam = seat % 2
  const teamSeats = seatTeam === 0 ? [0, 2] : [1, 3]
  return (tricks.value[teamSeats[0]] || 0) + (tricks.value[teamSeats[1]] || 0)
}

function isMyTeam(seat) {
  return seat % 2 === props.mySeat % 2
}

// Score badge computations
const myTeamTricks = computed(() => teamTricksWon(props.mySeat))
const myTeamTarget = computed(() => teamTarget(props.mySeat))
const oppTeamTricks = computed(() => teamTricksWon(props.mySeat % 2 === 0 ? 1 : 0))
const oppTeamTarget = computed(() => teamTarget(props.mySeat % 2 === 0 ? 1 : 0))

// Trump watermark symbol
const TRUMP_SYMBOLS = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }

// Game actions
function onGameAction(event, payload) {
  emit('game-action', event, payload)
}

function onPlayCard(card) {
  onGameAction('play_card', { card })
}

function onPartnerCard(card) {
  if (isPartnersTurn.value) {
    onGameAction('play_card', { card })
  }
}

function onBiddingAction(event, payload) {
  onGameAction(event, payload)
}

function onTram(payload) {
  showTram.value = false
  onGameAction('call_tram', payload)
}

function onRoundContinue() {
  showRoundSummary.value = false
  onGameAction('next_round', {})
}

function onPlayAgain() {
  onGameAction('start_game', {})
}

function onLeave() {
  emit('leave')
}
</script>

<template>
  <div class="h-full w-full relative overflow-hidden" style="background: radial-gradient(ellipse at 50% 40%, #162d4a 0%, #0f1b2d 60%, #0a1220 100%)">
    <!-- Trump watermark -->
    <div
      v-if="trump"
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
    >
      <span
        class="text-[220px] leading-none select-none"
        :class="['H','D'].includes(trump) ? 'text-red-400/[0.10]' : 'text-white/[0.10]'"
      >
        {{ TRUMP_SYMBOLS[trump] }}
      </span>
    </div>

    <!-- North player -->
    <div class="absolute top-2 left-1/2 -translate-x-1/2 z-10">
      <PlayerArea
        :seat="absSeat('north')"
        :seatData="seats[absSeat('north')]"
        :tricks="tricks[absSeat('north')] ?? 0"
        :losses="seats[absSeat('north')]?.losses ?? 0"
        :isDealer="dealer === absSeat('north')"
        :dealerScore="dealerScore"
        :isActive="activeSeat === absSeat('north')"
        :cardCount="showPartnerOnNorth ? 0 : (handSizes[absSeat('north')] ?? 0)"
        position="north"
        :isSouth="false"
        :supportSignal="seatSupportSignal(absSeat('north'))"
        :bidAction="seatBidAction(absSeat('north'))"
        :teamTricksWon="teamTricksWon(absSeat('north'))"
        :teamTricksNeeded="teamTarget(absSeat('north'))"
        :isMyTeam="isMyTeam(absSeat('north'))"
      />
    </div>

    <!-- Partner hand on north side (bid >= 10, during reveal or playing) -->
    <div
      v-if="showPartnerOnNorth && partnerHand && partnerHand.length > 0"
      class="absolute top-[90px] left-1/2 -translate-x-1/2 z-[12] w-full max-w-[360px]"
    >
      <PlayerHand
        :cards="partnerHand"
        :playableCards="isPartnersTurn ? playableCards : []"
        :myTurn="isPartnersTurn"
        :readOnly="!isPartnersTurn"
        :label="(seats[revealedPartnerSeat]?.name || 'Partner') + '\'s Hand'"
        :compact="true"
        @play-card="onPartnerCard"
      />
    </div>

    <!-- West player -->
    <div class="absolute left-2 top-[35%] -translate-y-1/2 z-10">
      <PlayerArea
        :seat="absSeat('west')"
        :seatData="seats[absSeat('west')]"
        :tricks="tricks[absSeat('west')] ?? 0"
        :losses="seats[absSeat('west')]?.losses ?? 0"
        :isDealer="dealer === absSeat('west')"
        :dealerScore="dealerScore"
        :isActive="activeSeat === absSeat('west')"
        :cardCount="handSizes[absSeat('west')] ?? 0"
        position="west"
        :isSouth="false"
        :supportSignal="seatSupportSignal(absSeat('west'))"
        :bidAction="seatBidAction(absSeat('west'))"
        :teamTricksWon="teamTricksWon(absSeat('west'))"
        :teamTricksNeeded="teamTarget(absSeat('west'))"
        :isMyTeam="isMyTeam(absSeat('west'))"
      />
    </div>

    <!-- East player -->
    <div class="absolute right-2 top-[35%] -translate-y-1/2 z-10">
      <PlayerArea
        :seat="absSeat('east')"
        :seatData="seats[absSeat('east')]"
        :tricks="tricks[absSeat('east')] ?? 0"
        :losses="seats[absSeat('east')]?.losses ?? 0"
        :isDealer="dealer === absSeat('east')"
        :dealerScore="dealerScore"
        :isActive="activeSeat === absSeat('east')"
        :cardCount="handSizes[absSeat('east')] ?? 0"
        position="east"
        :isSouth="false"
        :supportSignal="seatSupportSignal(absSeat('east'))"
        :bidAction="seatBidAction(absSeat('east'))"
        :teamTricksWon="teamTricksWon(absSeat('east'))"
        :teamTricksNeeded="teamTarget(absSeat('east'))"
        :isMyTeam="isMyTeam(absSeat('east'))"
      />
    </div>

    <!-- Center trick area -->
    <div class="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <TrickArea
        :currentTrick="gs.currentTrick ?? []"
        :mySeat="mySeat"
      />
    </div>

    <!-- Score badges -->
    <div v-if="bid != null && isPlaying" class="absolute top-[55%] left-2 z-10">
      <div class="bg-blue-600 border border-blue-400/30 rounded-xl px-2.5 py-1 text-center shadow-lg">
        <span class="text-white font-black text-xl">{{ myTeamTricks }}</span>
        <span class="text-blue-200 text-sm"> / {{ myTeamTarget }}</span>
      </div>
    </div>
    <div v-if="bid != null && isPlaying" class="absolute top-[55%] right-2 z-10">
      <div class="bg-red-600 border border-red-400/30 rounded-xl px-2.5 py-1 text-center shadow-lg">
        <span class="text-white font-black text-xl">{{ oppTeamTricks }}</span>
        <span class="text-red-200 text-sm"> / {{ oppTeamTarget }}</span>
      </div>
    </div>

    <!-- South (me) info -->
    <div class="absolute left-1/2 -translate-x-1/2 z-10 bottom-[130px]">
      <PlayerArea
        :seat="mySeat"
        :seatData="seats[mySeat]"
        :tricks="tricks[mySeat] ?? 0"
        :losses="seats[mySeat]?.losses ?? 0"
        :isDealer="dealer === mySeat"
        :dealerScore="dealerScore"
        :isActive="activeSeat === mySeat"
        :cardCount="myHand.length"
        position="south"
        :isSouth="true"
        :supportSignal="seatSupportSignal(mySeat)"
        :bidAction="seatBidAction(mySeat)"
        :teamTricksWon="teamTricksWon(mySeat)"
        :teamTricksNeeded="teamTarget(mySeat)"
        :isMyTeam="true"
      />
    </div>

    <!-- TRAM button + turn indicator -->
    <div v-if="isPlaying" class="absolute bottom-[130px] left-3 z-20">
      <button
        @click="showTram = true"
        class="bg-slate-700/80 hover:bg-slate-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
      >
        TRAM
      </button>
    </div>
    <div v-if="isPlaying && (isPartnersTurn || (myTurn && activeSeat === mySeat))" class="absolute bottom-[130px] right-3 z-20">
      <span v-if="isPartnersTurn" class="text-yellow-400 text-xs font-medium bg-slate-900/80 rounded px-2 py-1">
        Play partner's card
      </span>
      <span v-else class="text-yellow-400 text-xs font-medium bg-slate-900/80 rounded px-2 py-1">
        Your turn
      </span>
    </div>

    <!-- My hand -->
    <div class="absolute bottom-0 left-0 right-0 z-20">
      <div v-if="amRevealedPartner && isPlaying" class="px-3 pt-1 text-xs text-yellow-400 text-center">
        Your hand is revealed to all players
      </div>
      <PlayerHand
        :cards="myHand"
        :playableCards="isPartnersTurn ? [] : playableCards"
        :myTurn="myTurn && activeSeat === mySeat && !isPartnersTurn"
        :readOnly="amRevealedPartner && isPlaying"
        @play-card="onPlayCard"
      />
    </div>

    <!-- Bidding scrim (darkens table area above hand) -->
    <div v-if="isBidding" class="absolute top-0 left-0 right-0 bottom-[130px] bg-black/40 z-[18] pointer-events-none" />

    <!-- Bidding panel (floating, centered in upper area) -->
    <div v-if="isBidding" class="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-[320px] px-3" :class="showPartnerOnNorth ? 'top-[55%]' : 'top-[45%]'">
      <BiddingPanel
        :gameState="gs"
        :mySeat="mySeat"
        @ask-support="onBiddingAction('ask_support', {})"
        @give-support="(p) => onBiddingAction('give_support', p)"
        @place-bid="(p) => onBiddingAction('place_bid', p)"
        @pass-bid="onBiddingAction('pass_bid', {})"
        @increase-bid="(p) => onBiddingAction('increase_bid', p)"
        @start-play="onBiddingAction('start_play', {})"
      />
    </div>

    <!-- TRAM Overlay -->
    <TramOverlay
      v-if="showTram && isPlaying"
      :gameState="gs"
      :mySeat="mySeat"
      @call-tram="onTram"
      @close="showTram = false"
    />

    <!-- Round Summary Overlay -->
    <RoundSummary
      v-if="isScoring && showRoundSummary && lastRoundResult && !isGameOver"
      :lastRoundResult="lastRoundResult"
      :seats="seats"
      :tramResult="tramResult"
      @continue="onRoundContinue"
    />

    <!-- Game Over Screen -->
    <GameOverScreen
      v-if="isGameOver && lastRoundResult"
      :lastRoundResult="lastRoundResult"
      :seats="seats"
      :mySeat="mySeat"
      @play-again="onPlayAgain"
      @leave="onLeave"
    />
  </div>
</template>
