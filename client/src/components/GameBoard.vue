<script setup>
import { ref, computed } from 'vue'
import InfoBar from './InfoBar.vue'
import PlayerArea from './PlayerArea.vue'
import TrickArea from './TrickArea.vue'
import BidProgressBar from './BidProgressBar.vue'
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

const isBidding = computed(() =>
  phase.value === 'bidding' || phase.value === 'bidding_forced' || phase.value === 'partner_reveal'
)
const isPlaying = computed(() => phase.value === 'playing')
const isScoring = computed(() => phase.value === 'scoring')
const isGameOver = computed(() => lastRoundResult.value?.gameOver === true)

// Partner seat
const partnerSeat = computed(() => (props.mySeat + 2) % 4)

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
  const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
  return `Bid ${entry.bid} ${SUITS[entry.trump] || ''}`
}

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
}

function onPlayAgain() {
  onGameAction('start_game', {})
}

function onLeave() {
  emit('leave')
}

// Check positions for layout
const POSITIONS = ['north', 'west', 'east']
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0f1b2d] overflow-hidden">
    <!-- Info Bar -->
    <InfoBar
      :trump="trump"
      :dealerScore="dealerScore"
      :dealer="dealer"
      :seats="seats"
      :bid="bid"
      :biddingSeat="biddingSeat"
    />

    <!-- Main play area (scrollable if needed) -->
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <!-- North player -->
      <div class="flex justify-center pt-3 pb-1">
        <PlayerArea
          :seat="absSeat('north')"
          :seatData="seats[absSeat('north')]"
          :tricks="tricks[absSeat('north')] ?? 0"
          :losses="seats[absSeat('north')]?.losses ?? 0"
          :isDealer="dealer === absSeat('north')"
          :isActive="activeSeat === absSeat('north')"
          :cardCount="handSizes[absSeat('north')] ?? 0"
          position="north"
          :isSouth="false"
          :supportSignal="seatSupportSignal(absSeat('north'))"
          :bidAction="seatBidAction(absSeat('north'))"
        />
      </div>

      <!-- West + Trick Area + East -->
      <div class="flex items-center justify-between px-3 flex-1 min-h-0">
        <!-- West -->
        <PlayerArea
          :seat="absSeat('west')"
          :seatData="seats[absSeat('west')]"
          :tricks="tricks[absSeat('west')] ?? 0"
          :losses="seats[absSeat('west')]?.losses ?? 0"
          :isDealer="dealer === absSeat('west')"
          :isActive="activeSeat === absSeat('west')"
          :cardCount="handSizes[absSeat('west')] ?? 0"
          position="west"
          :isSouth="false"
          :supportSignal="seatSupportSignal(absSeat('west'))"
          :bidAction="seatBidAction(absSeat('west'))"
        />

        <!-- Center trick area -->
        <div class="flex-1 flex items-center justify-center py-2">
          <TrickArea
            :currentTrick="gs.currentTrick ?? []"
            :mySeat="mySeat"
          />
        </div>

        <!-- East -->
        <PlayerArea
          :seat="absSeat('east')"
          :seatData="seats[absSeat('east')]"
          :tricks="tricks[absSeat('east')] ?? 0"
          :losses="seats[absSeat('east')]?.losses ?? 0"
          :isDealer="dealer === absSeat('east')"
          :isActive="activeSeat === absSeat('east')"
          :cardCount="handSizes[absSeat('east')] ?? 0"
          position="east"
          :isSouth="false"
          :supportSignal="seatSupportSignal(absSeat('east'))"
          :bidAction="seatBidAction(absSeat('east'))"
        />
      </div>

      <!-- South (me) -->
      <div class="flex justify-center pb-1">
        <PlayerArea
          :seat="mySeat"
          :seatData="seats[mySeat]"
          :tricks="tricks[mySeat] ?? 0"
          :losses="seats[mySeat]?.losses ?? 0"
          :isDealer="dealer === mySeat"
          :isActive="activeSeat === mySeat"
          :cardCount="myHand.length"
          position="south"
          :isSouth="true"
          :supportSignal="seatSupportSignal(mySeat)"
          :bidAction="seatBidAction(mySeat)"
        />
      </div>

      <!-- Bidding panel (overlays during bidding phases) -->
      <div v-if="isBidding">
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

      <!-- Partner hand (bid >= 10, playing phase) -->
      <div
        v-if="isPlaying && partnerHand && partnerHand.length > 0"
        class="bg-slate-800/90 border-t border-slate-700"
      >
        <div class="px-3 pt-2 pb-1">
          <div class="text-xs text-slate-400 uppercase tracking-wider mb-1">
            {{ seats[partnerSeat]?.name || 'Partner' }}'s Hand
            <span v-if="amRevealedPartner" class="text-yellow-400 ml-2">(revealed)</span>
          </div>
          <PlayerHand
            :cards="partnerHand"
            :playableCards="isPartnersTurn ? playableCards : []"
            :myTurn="isPartnersTurn"
            :readOnly="!isPartnersTurn"
            @play-card="onPartnerCard"
          />
        </div>
        <!-- Prompt when it's partner's turn -->
        <div v-if="isPartnersTurn" class="px-3 pb-2 text-center text-sm text-yellow-400">
          Pick a card for {{ seats[partnerSeat]?.name || 'partner' }} to play
        </div>
        <div v-else-if="amRevealedPartner && activeSeat === partnerSeat" class="px-3 pb-2 text-center text-sm text-slate-400">
          {{ seats[biddingSeat]?.name || 'Bidder' }} is choosing your card…
        </div>
      </div>

      <!-- Bid progress bar -->
      <BidProgressBar
        v-if="bid != null"
        :bid="bid"
        :biddingTeam="biddingTeam"
        :tricks="tricks"
        :mySeat="mySeat"
      />

      <!-- TRAM button + your turn indicator -->
      <div v-if="isPlaying" class="flex items-center justify-between px-4 py-2">
        <button
          @click="showTram = true"
          class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          TRAM
        </button>
        <span v-if="isPartnersTurn" class="text-yellow-400 text-sm font-medium">
          Play partner's card
        </span>
        <span v-else-if="myTurn && activeSeat === mySeat" class="text-yellow-400 text-sm font-medium">
          Your turn
        </span>
      </div>

      <!-- My hand -->
      <div class="border-t border-slate-700">
        <div v-if="amRevealedPartner && isPlaying" class="px-3 pt-2 text-xs text-yellow-400 text-center">
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
