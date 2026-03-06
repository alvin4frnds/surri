<script setup>
const props = defineProps({
  bid: { type: Number, default: null },
  biddingTeam: { type: Number, default: null },
  tricks: { type: Object, default: () => ({}) },
  mySeat: { type: Number, required: true },
})

function myTeam() {
  return props.mySeat % 2
}

function biddingTeamTricks() {
  if (props.biddingTeam == null) return 0
  const seats = props.biddingTeam === 0 ? [0, 2] : [1, 3]
  return (props.tricks[seats[0]] || 0) + (props.tricks[seats[1]] || 0)
}

function defendingTeamTricks() {
  if (props.biddingTeam == null) return 0
  const seats = props.biddingTeam === 0 ? [1, 3] : [0, 2]
  return (props.tricks[seats[0]] || 0) + (props.tricks[seats[1]] || 0)
}

function defenseTarget() {
  if (!props.bid) return 0
  return 14 - props.bid
}

function biddingLabel() {
  const bt = props.biddingTeam
  if (bt == null) return '...'
  return bt === myTeam() ? 'Us' : 'Them'
}

function defendingLabel() {
  const bt = props.biddingTeam
  if (bt == null) return '...'
  return bt === myTeam() ? 'Them' : 'Us'
}

function bidPct() {
  if (!props.bid) return 0
  return Math.min(100, (biddingTeamTricks() / props.bid) * 100)
}

function defPct() {
  const dt = defenseTarget()
  if (!dt) return 0
  return Math.min(100, (defendingTeamTricks() / dt) * 100)
}
</script>

<template>
  <div v-if="bid != null" class="bg-slate-800 border-t border-slate-700 px-4 py-2">
    <!-- Bidding team -->
    <div class="flex items-center gap-2 text-xs mb-1">
      <span class="text-green-400 w-12">{{ biddingLabel() }}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-2">
        <div
          class="bg-green-500 h-2 rounded-full transition-all"
          :style="`width: ${bidPct()}%`"
        />
      </div>
      <span class="text-slate-300 w-10 text-right">{{ biddingTeamTricks() }}/{{ bid }}</span>
    </div>

    <!-- Defending team -->
    <div class="flex items-center gap-2 text-xs">
      <span class="text-orange-400 w-12">{{ defendingLabel() }}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-2">
        <div
          class="bg-orange-500 h-2 rounded-full transition-all"
          :style="`width: ${defPct()}%`"
        />
      </div>
      <span class="text-slate-300 w-10 text-right">{{ defendingTeamTricks() }}/{{ defenseTarget() }}</span>
    </div>
  </div>
</template>
