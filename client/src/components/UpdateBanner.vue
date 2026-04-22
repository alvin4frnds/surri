<script setup>
defineEmits(['reload', 'dismiss'])
</script>

<template>
  <div class="fixed top-0 left-0 right-0 z-[110] bg-[var(--app-surface-2)] border-b border-[var(--app-rule)] px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
    <span class="text-sm text-[var(--app-ink)] flex-1">
      New version available.
    </span>
    <button
      @click="$emit('reload')"
      class="bg-[var(--app-accent)] text-[var(--app-accent-ink)] text-xs font-bold rounded-md px-3 py-1.5 hover:brightness-110"
    >
      Reload
    </button>
    <button
      @click="$emit('dismiss')"
      class="text-[var(--app-muted)] text-xs px-2 py-1.5 hover:text-[var(--app-ink)]"
    >
      Later
    </button>
  </div>
</template>
