<script setup>
import { ref } from 'vue'

const show = ref(false)
</script>

<template>
  <!-- Help trigger button -->
  <button
    @click="show = true"
    class="fixed bottom-4 right-4 z-[40] w-10 h-10 rounded-full bg-[var(--app-surface-2)]/90 hover:brightness-125 text-[var(--app-ink)] text-lg font-bold flex items-center justify-center shadow-lg border border-[var(--app-rule)] transition-colors"
  >
    ?
  </button>

  <!-- Help overlay -->
  <Teleport to="body">
    <Transition name="help-fade">
      <div v-if="show" class="fixed inset-0 z-[50] bg-black/80 flex items-center justify-center p-4" @click.self="show = false">
        <div class="bg-[var(--app-surface)] border border-[var(--app-rule)] rounded-2xl max-w-[360px] w-full max-h-[80vh] overflow-y-auto p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-[var(--app-ink)]">How to Play Surri</h2>
            <button @click="show = false" class="text-[var(--app-muted)] hover:text-[var(--app-ink)] text-xl font-bold">&#x2715;</button>
          </div>

          <div class="space-y-3 text-sm text-[var(--app-muted)] leading-relaxed">
            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Overview</h3>
              <p>4 players, 2 teams (partners sit across). Standard 52-card deck, 13 cards each. A trick-taking game where high score is bad!</p>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Bidding</h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Starting left of dealer, each player can pass or bid 10+</li>
                <li>You can ask your partner for support (Major/Minor/Pass) before bidding</li>
                <li>If all 4 pass, the first player must bid 8+</li>
                <li>The bidder picks the trump suit</li>
              </ul>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Bid 10+</h3>
              <p>Partner's hand is revealed to everyone. The bidder plays cards for both hands.</p>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Playing Tricks</h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Must follow the led suit if you can</li>
                <li>Any suit can be led (no breaking rule)</li>
                <li>Highest trump wins, otherwise highest card of led suit</li>
                <li>Round ends early when either team hits their target</li>
              </ul>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Scoring</h3>
              <p>Only the dealer's team has a score (high = bad, 52+ = lose).</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Opponent bids X and makes it: dealer score += X</li>
                <li>Opponent bids X and fails: dealer score -= 2X</li>
                <li>Dealer's team bids X and makes it: dealer score -= X</li>
                <li>Dealer's team bids X and fails: dealer score += 2X</li>
              </ul>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Winning</h3>
              <p>Score hits 52+ = dealer loses (score resets, partner deals next). Game ends when 3 players have each lost at least once — the 4th player wins!</p>
            </section>

            <section>
              <h3 class="text-[var(--app-ink)] font-semibold mb-1">Special Moves</h3>
              <ul class="list-disc list-inside space-y-1">
                <li><strong>TRAM:</strong> Claim all remaining tricks by showing your winning cards in order</li>
                <li><strong>Dhaap:</strong> Signal your partner to play the suit you're about to play</li>
                <li><strong>Bid 13:</strong> Instant win or lose — existing scores don't matter</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.help-fade-enter-active, .help-fade-leave-active {
  transition: opacity 0.2s;
}
.help-fade-enter-from, .help-fade-leave-to {
  opacity: 0;
}
</style>
