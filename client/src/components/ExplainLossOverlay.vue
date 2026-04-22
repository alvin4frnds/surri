<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  completedTricks: { type: Array, default: () => [] },
  handsAtTramCall: { type: Object, default: null },
  tramResult: { type: Object, required: true },
  trump: { type: String, default: null },
  seats: { type: Array, default: () => [] },
  mySeat: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' }
const RANK_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }
const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 }

function seatName(s) {
  return props.seats[s]?.name || `Seat ${s}`
}

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sa = SUIT_ORDER[a.slice(-1)] ?? 9
    const sb = SUIT_ORDER[b.slice(-1)] ?? 9
    if (sa !== sb) return sa - sb
    return (RANK_ORDER[b.slice(0, -1)] || 0) - (RANK_ORDER[a.slice(0, -1)] || 0)
  })
}

// Derive each seat's dealt hand: cards they played in completed tricks + cards still in hand at TRAM call
const dealtHands = computed(() => {
  const out = { 0: [], 1: [], 2: [], 3: [] }
  for (const trick of props.completedTricks || []) {
    for (const play of trick.cards) {
      out[play.seat].push(play.card)
    }
  }
  if (props.handsAtTramCall) {
    for (let s = 0; s < 4; s++) {
      for (const c of props.handsAtTramCall[s] || []) {
        out[s].push(c)
      }
    }
  }
  return out
})

// Build timeline of frames
const frames = computed(() => {
  const out = []
  const played = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() }

  const snapshotHands = () => {
    const h = {}
    for (let s = 0; s < 4; s++) {
      h[s] = dealtHands.value[s].filter(c => !played[s].has(c))
    }
    return h
  }

  // Phase A — tricks actually played
  const tricks = props.completedTricks || []
  for (let ti = 0; ti < tricks.length; ti++) {
    const trick = tricks[ti]
    for (let ci = 0; ci < trick.cards.length; ci++) {
      const play = trick.cards[ci]
      played[play.seat].add(play.card)
      const trickSoFar = trick.cards.slice(0, ci + 1)
      out.push({
        phase: 'trick',
        trickIndex: ti,
        cardIndex: ci,
        trickCards: trickSoFar,
        trickWinner: ci === trick.cards.length - 1 ? trick.winner : null,
        hands: snapshotHands(),
        caption: `Trick ${ti + 1} — ${seatName(play.seat)} plays ${formatCard(play.card)}`,
      })
    }
  }

  // Phase B — TRAM attempt
  const tr = props.tramResult
  if (tr && tr.cards && tr.cards.length) {
    const callerSeat = tr.callerSeat
    const partnerSeat = (callerSeat + 2) % 4
    const partnerCards = tr.partnerCards || null
    const tramPlayed = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() }

    for (let i = 0; i < tr.cards.length; i++) {
      const myCard = tr.cards[i]
      tramPlayed[callerSeat].add(myCard)
      const trickCards = [{ seat: callerSeat, card: myCard }]
      if (partnerCards && partnerCards[i]) {
        tramPlayed[partnerSeat].add(partnerCards[i])
        trickCards.push({ seat: partnerSeat, card: partnerCards[i] })
      }

      // Base hands for this TRAM step
      const baseHands = {}
      for (let s = 0; s < 4; s++) {
        const src = props.handsAtTramCall?.[s] || []
        baseHands[s] = src.filter(c => !tramPlayed[s].has(c))
      }

      const failHere = !tr.valid && tr.failClaimIndex === i && tr.failCard && tr.failSeat != null
      let caption = `TRAM claim ${i + 1}/${tr.cards.length} — ${seatName(callerSeat)} plays ${formatCard(myCard)}`
      if (partnerCards && partnerCards[i]) {
        caption += ` + partner ${formatCard(partnerCards[i])}`
      }
      if (failHere) {
        caption = `${seatName(tr.failSeat)} defeats ${formatCard(myCard)} with ${formatCard(tr.failCard)}`
      }

      const displayTrick = failHere
        ? [...trickCards, { seat: tr.failSeat, card: tr.failCard, defeating: true }]
        : trickCards

      out.push({
        phase: 'tram',
        claimIndex: i,
        trickCards: displayTrick,
        hands: baseHands,
        revealSeat: failHere ? tr.failSeat : null,
        caption,
        isFail: failHere,
      })

      if (failHere) break
    }
  }

  return out
})

const stepIndex = ref(0)
const totalSteps = computed(() => frames.value.length)
const frame = computed(() => frames.value[stepIndex.value] || null)

function next() {
  if (stepIndex.value < totalSteps.value - 1) stepIndex.value++
}
function prev() {
  if (stepIndex.value > 0) stepIndex.value--
}

function onKey(e) {
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function formatCard(card) {
  if (!card) return ''
  const suit = card.slice(-1)
  const rank = card.slice(0, -1)
  return `${rank}${SUITS[suit] || suit}`
}

// Relative position: south = me, west = left, north = across, east = right
function relPos(seat) {
  const delta = (seat - props.mySeat + 4) % 4
  return ['south', 'west', 'north', 'east'][delta]
}

function seatByPos(pos) {
  const idx = ['south', 'west', 'north', 'east'].indexOf(pos)
  return (props.mySeat + idx) % 4
}

function isDefeatingCard(play) {
  return !!play.defeating
}
</script>

<template>
  <div class="absolute inset-0 bg-black/90 z-40 flex flex-col text-[var(--app-ink)]">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-[var(--app-surface)] border-b border-[var(--app-rule)]">
      <div class="text-sm font-bold">Explain Loss</div>
      <div class="text-xs text-[var(--app-muted)]">Step {{ stepIndex + 1 }} / {{ totalSteps }}</div>
      <button
        @click="emit('close')"
        class="text-[var(--app-muted)] hover:text-[var(--app-ink)] px-2 py-1 text-sm"
      >✕</button>
    </div>

    <!-- Caption -->
    <div
      class="px-4 py-2 text-center text-sm"
      :class="frame?.isFail ? 'bg-[var(--app-danger)]/30 text-[var(--app-danger)] font-bold' : 'bg-[var(--app-surface-2)] text-[var(--app-ink)]'"
    >
      {{ frame?.caption || '' }}
    </div>

    <!-- Board -->
    <div class="flex-1 relative overflow-hidden bg-[var(--app-bg)]">
      <!-- Trump indicator -->
      <div v-if="trump" class="absolute top-2 right-2 text-xs text-[var(--app-muted)]">
        Trump: <span class="text-[var(--app-dealer)] font-bold">{{ SUITS[trump] }}</span>
      </div>

      <!-- North -->
      <div class="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 max-w-[92%]">
        <div class="text-xs text-[var(--app-muted)]">{{ seatName(seatByPos('north')) }}</div>
        <div class="flex flex-wrap justify-center gap-0.5">
          <Card
            v-for="c in sortHand(frame?.hands?.[seatByPos('north')] || [])"
            :key="'n-' + c"
            :card="c"
            size="sm"
          />
        </div>
      </div>

      <!-- West -->
      <div class="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 max-w-[38%]">
        <div class="text-xs text-[var(--app-muted)]">{{ seatName(seatByPos('west')) }}</div>
        <div class="flex flex-wrap justify-center gap-0.5">
          <Card
            v-for="c in sortHand(frame?.hands?.[seatByPos('west')] || [])"
            :key="'w-' + c"
            :card="c"
            size="sm"
          />
        </div>
      </div>

      <!-- East -->
      <div class="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 max-w-[38%]">
        <div class="text-xs text-[var(--app-muted)]">{{ seatName(seatByPos('east')) }}</div>
        <div class="flex flex-wrap justify-center gap-0.5">
          <Card
            v-for="c in sortHand(frame?.hands?.[seatByPos('east')] || [])"
            :key="'e-' + c"
            :card="c"
            size="sm"
          />
        </div>
      </div>

      <!-- Center: trick cards being played -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="flex flex-col items-center gap-1">
          <div class="text-xs text-[var(--app-muted)] uppercase tracking-wider">
            {{ frame?.phase === 'tram' ? 'TRAM' : 'Trick' }}
          </div>
          <div class="flex gap-1 items-center">
            <div
              v-for="(play, idx) in frame?.trickCards || []"
              :key="'t-' + idx"
              class="flex flex-col items-center gap-0.5"
            >
              <div class="text-[10px] text-[var(--app-muted)]">{{ seatName(play.seat) }}</div>
              <div :class="isDefeatingCard(play) ? 'ring-2 ring-[var(--app-danger)] rounded-lg' : ''">
                <Card :card="play.card" size="md" />
              </div>
              <div v-if="isDefeatingCard(play)" class="text-[10px] text-[var(--app-danger)] font-bold">BEATS</div>
            </div>
          </div>
        </div>
      </div>

      <!-- South (me) -->
      <div class="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 max-w-[92%]">
        <div class="flex flex-wrap justify-center gap-0.5">
          <Card
            v-for="c in sortHand(frame?.hands?.[seatByPos('south')] || [])"
            :key="'s-' + c"
            :card="c"
            size="sm"
          />
        </div>
        <div class="text-xs text-[var(--app-muted)]">{{ seatName(seatByPos('south')) }} (you)</div>
      </div>
    </div>

    <!-- Nav -->
    <div class="flex gap-2 p-3 bg-[var(--app-surface)] border-t border-[var(--app-rule)]">
      <button
        @click="prev"
        :disabled="stepIndex === 0"
        class="flex-1 bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-ink)] font-bold rounded-lg py-2 border border-[var(--app-rule)]"
      >◀ Prev</button>
      <button
        @click="next"
        :disabled="stepIndex >= totalSteps - 1"
        class="flex-1 bg-[var(--app-surface-2)] hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--app-ink)] font-bold rounded-lg py-2 border border-[var(--app-rule)]"
      >Next ▶</button>
    </div>
  </div>
</template>
