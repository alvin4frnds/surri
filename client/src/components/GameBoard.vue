<script setup>
import { ref, computed } from 'vue'
import PlayerArea from './PlayerArea.vue'
import TrickArea from './TrickArea.vue'
import BiddingPanel from './BiddingPanel.vue'
import PlayerHand from './PlayerHand.vue'
import TramOverlay from './TramOverlay.vue'
import IssueReportOverlay from './IssueReportOverlay.vue'
import { toPng } from 'html-to-image'
import RoundSummary from './RoundSummary.vue'
import GameOverScreen from './GameOverScreen.vue'

const props = defineProps({
  gameState: { type: Object, required: true },
  mySeat: { type: Number, required: true },
})

const emit = defineEmits(['game-action', 'leave'])

const showTram = ref(false)
const showRoundSummary = ref(false)
const showDealing = ref(false)

// Track phase transitions
import { watch } from 'vue'
watch(() => props.gameState?.phase, (newPhase, oldPhase) => {
  if (newPhase === 'scoring') {
    showRoundSummary.value = true
  } else if (newPhase !== 'scoring') {
    showRoundSummary.value = false
  }
  // Show dealing animation only at the start of a new round (not when transitioning between bidding sub-phases)
  if ((newPhase === 'bidding' || newPhase === 'bidding_forced') && oldPhase !== 'bidding' && oldPhase !== 'bidding_forced') {
    showDealing.value = true
    setTimeout(() => { showDealing.value = false }, 1200)
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
const dhaaps = computed(() => gs.value?.dhaaps ?? {})

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
  if (!isBidding.value) return null
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

const showGiveUpConfirm = ref(false)

function onGiveUp() {
  showGiveUpConfirm.value = false
  onGameAction('give_up', {})
}

function onRoundContinue() {
  showRoundSummary.value = false
  onGameAction('next_round', {})
}

function onPlayAgain() {
  onGameAction('start_game', {})
}

const showLeaveConfirm = ref(false)
const showIssueReport = ref(false)
const issueSubmitted = ref(false)
const issueScreenshot = ref(null)

async function onIssueClick() {
  // Capture screenshot BEFORE showing overlay (so the overlay scrim isn't in the screenshot)
  try {
    const target = document.querySelector('.game-capture-target') || document.body
    issueScreenshot.value = await toPng(target, { backgroundColor: '#0f1b2d' })
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    issueScreenshot.value = null
  }
  showIssueReport.value = true
}

// Check if I'm the only human player
const isOnlyHuman = computed(() => {
  return seats.value.filter(s => s && !s.isBot && s.isConnected).length <= 1
})

function onLeaveClick() {
  if (isOnlyHuman.value) {
    showLeaveConfirm.value = true
  } else {
    emit('leave')
  }
}

function onLeaveConfirmed() {
  showLeaveConfirm.value = false
  emit('leave')
}

function onLeave() {
  emit('leave')
}

function onIssueSubmit({ description, screenshot }) {
  showIssueReport.value = false
  issueSubmitted.value = true
  onGameAction('report_issue', { description, screenshot })
}
</script>

<template>
  <div class="game-capture-target h-full w-full relative overflow-hidden" style="background: radial-gradient(ellipse at 50% 40%, #162d4a 0%, #0f1b2d 60%, #0a1220 100%)">
    <!-- Dealing animation -->
    <Transition name="deal-fade">
      <div v-if="showDealing" class="absolute inset-0 z-[25] flex items-center justify-center pointer-events-none">
        <div class="deal-cards-container">
          <div v-for="i in 8" :key="i" class="deal-card" :style="`--deal-index: ${i}; --deal-angle: ${(i - 1) * 45}deg`" />
        </div>
        <span class="text-white/80 text-sm font-medium uppercase tracking-widest">Dealing...</span>
      </div>
    </Transition>

    <!-- Trump watermark -->
    <div
      v-if="trump"
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
    >
      <span
        class="text-[180px] sm:text-[220px] leading-none select-none"
        :class="['H','D'].includes(trump) ? 'text-red-400/[0.10]' : 'text-white/[0.10]'"
      >
        {{ TRUMP_SYMBOLS[trump] }}
      </span>
    </div>

    <!-- Leave + Give Up + Issue buttons (top-right) -->
    <div class="absolute top-2 right-2 z-[22] flex flex-col gap-1.5 items-end">
      <button
        @click="onLeaveClick"
        class="bg-slate-800/80 hover:bg-red-700 text-slate-400 hover:text-white text-xs rounded-lg px-2 py-1 transition-colors"
      >
        Quit game
      </button>
      <button
        v-if="isPlaying"
        @click="showGiveUpConfirm = true"
        class="bg-red-900/60 hover:bg-red-800/80 text-red-300 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
      >
        Give Up
      </button>
      <button
        v-if="!issueSubmitted"
        @click="onIssueClick"
        class="bg-slate-800/80 hover:bg-amber-700 text-slate-400 hover:text-white text-xs rounded-lg px-2 py-1 transition-colors"
        title="Report an issue"
      >
        &#x26A0; Issue
      </button>
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
        :showTrickCircles="true"
      />
    </div>

    <!-- Partner hand on north side (bid >= 10, during reveal or playing) -->
    <div
      v-if="showPartnerOnNorth && partnerHand && partnerHand.length > 0"
      class="absolute top-[11%] left-1/2 -translate-x-1/2 z-[12] w-full max-w-[360px]"
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
        :showTrickCircles="true"
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
        :showTrickCircles="false"
      />
    </div>

    <!-- Center trick area -->
    <div class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" :class="showPartnerOnNorth ? 'top-[38%]' : 'top-[30%]'">
      <TrickArea
        :currentTrick="gs.currentTrick ?? []"
        :mySeat="mySeat"
        :dhaaps="dhaaps"
      />
    </div>

    <!-- Score badges (visible whenever bid exists) -->
    <div v-if="bid != null" class="absolute top-3 left-3 z-[11]">
      <div class="bg-blue-600 border border-blue-400/30 rounded-xl px-2.5 py-1 text-center shadow-lg">
        <span class="text-white font-black text-xl">{{ myTeamTricks }}</span>
        <span class="text-blue-200 text-sm"> / {{ myTeamTarget }}</span>
      </div>
    </div>
    <div v-if="bid != null" class="absolute top-[55%] right-2 z-10">
      <div class="bg-red-600 border border-red-400/30 rounded-xl px-2.5 py-1 text-center shadow-lg">
        <span class="text-white font-black text-xl">{{ oppTeamTricks }}</span>
        <span class="text-red-200 text-sm"> / {{ oppTeamTarget }}</span>
      </div>
    </div>

    <!-- South (me) info -->
    <div class="absolute left-1/2 -translate-x-1/2 z-10 bottom-[15%]">
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
        :showTrickCircles="false"
      />
    </div>

    <!-- TRAM + Dhaap buttons -->
    <div v-if="isPlaying && activeSeat === mySeat" class="absolute bottom-[15%] left-3 z-20 flex flex-col gap-1.5">
      <button
        v-if="(gs.currentTrick ?? []).length === 0"
        @click="showTram = true"
        class="bg-slate-700/80 hover:bg-slate-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
      >
        TRAM
      </button>
      <button
        v-if="!dhaaps[mySeat]"
        @click="onGameAction('declare_dhaap', {})"
        class="bg-amber-700/80 hover:bg-amber-600 text-amber-100 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors border border-amber-600/40"
      >
        Dhaap!
      </button>
    </div>
    <div v-if="isPlaying && (isPartnersTurn || (myTurn && activeSeat === mySeat))" class="absolute bottom-[15%] right-3 z-20">
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
    <div v-if="isBidding" class="absolute top-0 left-0 right-0 bottom-[15%] bg-black/40 z-[18] pointer-events-none" />

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
      :mySeat="mySeat"
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

    <!-- Leave confirmation dialog -->
    <!-- Give Up confirmation -->
    <div v-if="showGiveUpConfirm" class="absolute inset-0 bg-black/70 z-[30] flex items-center justify-center">
      <div class="bg-slate-800 border border-slate-600 rounded-2xl p-5 max-w-[280px] text-center space-y-4">
        <div class="text-white text-sm font-medium">Give up this round? All remaining tricks go to opponents.</div>
        <div class="flex gap-3">
          <button
            @click="showGiveUpConfirm = false"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="onGiveUp"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Give Up
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLeaveConfirm" class="absolute inset-0 bg-black/70 z-[30] flex items-center justify-center">
      <div class="bg-slate-800 border border-slate-600 rounded-2xl p-5 max-w-[280px] text-center space-y-4">
        <div class="text-white text-sm font-medium">You are the only human player. Leaving will end the game.</div>
        <div class="flex gap-3">
          <button
            @click="showLeaveConfirm = false"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Stay
          </button>
          <button
            @click="onLeaveConfirmed"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Quit game
          </button>
        </div>
      </div>
    </div>

    <!-- Issue Report Overlay -->
    <IssueReportOverlay
      :show="showIssueReport"
      :screenshot="issueScreenshot"
      @close="showIssueReport = false"
      @submit="onIssueSubmit"
    />
  </div>
</template>

<style scoped>
.deal-fade-enter-active { transition: opacity 0.2s; }
.deal-fade-leave-active { transition: opacity 0.4s; }
.deal-fade-enter-from, .deal-fade-leave-to { opacity: 0; }

.deal-cards-container {
  position: absolute;
  width: 100%;
  height: 100%;
}
.deal-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 28px;
  border-radius: 3px;
  background: linear-gradient(145deg, #1a3a5c, #0d2440);
  border: 1.5px solid #c9a84c;
  animation: dealFly 0.8s ease-out forwards;
  animation-delay: calc(var(--deal-index) * 0.08s);
  opacity: 0;
}
@keyframes dealFly {
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translate(
    calc(-50% + cos(var(--deal-angle)) * 120px),
    calc(-50% + sin(var(--deal-angle)) * 120px)
  ) rotate(360deg) scale(0.6); opacity: 0; }
}
</style>
