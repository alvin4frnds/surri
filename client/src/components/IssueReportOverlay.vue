<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  screenshot: { type: String, default: null },
})

const emit = defineEmits(['close', 'submit'])

const description = ref('')
const submitting = ref(false)

watch(() => props.show, (visible) => {
  if (visible) {
    description.value = ''
    submitting.value = false
  }
})

function onSubmit() {
  if (!description.value.trim() || submitting.value) return
  submitting.value = true
  emit('submit', {
    description: description.value.trim(),
    screenshot: props.screenshot,
  })
}

function onClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="issue-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[50] bg-black/80 flex items-center justify-center p-4"
        @click.self="onClose"
      >
        <div class="bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-2xl max-w-[360px] w-full p-4 space-y-3">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-[var(--app-ink)]">Report Issue</h2>
            <button @click="onClose" class="text-[var(--app-muted)] hover:text-[var(--app-ink)] text-xl font-bold">&#x2715;</button>
          </div>

          <!-- Screenshot preview (thumbnail) -->
          <div>
            <p class="text-xs text-[var(--app-muted)] mb-1">Screenshot (auto-captured)</p>
            <img
              v-if="screenshot"
              :src="screenshot"
              class="h-20 rounded border border-[var(--app-rule)] object-cover"
              alt="Game screenshot"
            />
            <div v-else class="h-12 bg-[var(--app-surface-2)] rounded flex items-center justify-center text-[var(--app-muted)] text-xs">
              Screenshot unavailable
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="text-xs text-[var(--app-muted)] mb-1 block">Describe the issue *</label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="What went wrong? What did you expect to happen?"
              class="w-full bg-[var(--app-surface-2)] border border-[var(--app-rule)] rounded-lg px-3 py-2 text-sm text-[var(--app-ink)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent-2)] resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-end">
            <button
              @click="onClose"
              class="bg-[var(--app-surface-2)] hover:brightness-125 text-[var(--app-ink)] text-sm rounded-lg px-4 py-2 transition-colors border border-[var(--app-rule)]"
            >
              Cancel
            </button>
            <button
              @click="onSubmit"
              :disabled="!description.trim() || submitting"
              class="bg-[var(--app-accent-2)] hover:brightness-110 disabled:bg-[var(--app-surface-2)] disabled:text-[var(--app-muted)] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {{ submitting ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.issue-fade-enter-active, .issue-fade-leave-active {
  transition: opacity 0.2s;
}
.issue-fade-enter-from, .issue-fade-leave-to {
  opacity: 0;
}
</style>
