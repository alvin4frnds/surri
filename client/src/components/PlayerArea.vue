<script setup>
const props = defineProps({
  seat: { type: Number, required: true },
  seatData: { type: Object, default: null },
  tricks: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  isDealer: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
  position: { type: String, required: true }, // 'south' | 'north' | 'west' | 'east'
  isSouth: { type: Boolean, default: false },
  supportSignal: { type: String, default: null },
  bidAction: { type: String, default: null }, // 'pass' | 'bid X T'
})

const isHorizontal = props.position === 'west' || props.position === 'east'
</script>

<template>
  <div
    class="flex flex-col items-center gap-1 relative"
    :class="[
      isActive ? 'ring-2 ring-yellow-400 rounded-xl' : '',
    ]"
  >
    <!-- Card backs (opponents) -->
    <div v-if="!isSouth && cardCount > 0" class="flex gap-0.5 mb-1">
      <div
        v-for="i in Math.min(cardCount, 6)"
        :key="i"
        class="w-5 h-7 bg-slate-700 border border-slate-500 rounded"
        :style="`transform: rotate(${(i - Math.min(cardCount,6)/2 - 0.5) * 3}deg)`"
      />
    </div>

    <!-- Speech bubble -->
    <div
      v-if="supportSignal || bidAction"
      class="bg-slate-700 border border-slate-500 rounded-lg px-2 py-1 text-xs text-slate-200 mb-1 text-center"
    >
      {{ supportSignal || bidAction }}
    </div>

    <!-- Player info box -->
    <div
      class="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-center min-w-[72px]"
      :class="!seatData?.isConnected && seatData ? 'opacity-50' : ''"
    >
      <!-- Name row -->
      <div class="flex items-center justify-center gap-1">
        <span v-if="seatData?.isBot" class="text-sm">🤖</span>
        <span v-else-if="!seatData?.isConnected && seatData" class="text-sm">🤖</span>
        <span v-else class="text-sm">👤</span>

        <span class="text-xs font-medium text-slate-200 truncate max-w-[60px]">
          {{ seatData?.name || '…' }}
        </span>

        <span v-if="isSouth" class="text-green-400 text-xs">(you)</span>
        <span v-if="isDealer" class="text-yellow-400 text-xs">👑</span>
      </div>

      <!-- Tricks and losses -->
      <div class="flex items-center justify-center gap-2 mt-1">
        <span class="text-xs text-slate-400">{{ tricks }} trk</span>
        <span
          v-if="losses > 0"
          class="bg-red-700 text-white text-xs rounded-full px-1.5 py-0.5 font-bold"
        >
          {{ losses }}
        </span>
      </div>
    </div>
  </div>
</template>
