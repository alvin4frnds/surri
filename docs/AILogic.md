# AI Bot Logic — Surri

This document defines AI decision-making for bot players in Surri. Bots participate in support signals, bidding, trick play, partner-hand control (when bid ≥10), and TRAM claims.

See [GameFlow.md](GameFlow.md) for the full game rules.

---

## 1. Hand Evaluation

Before any bidding decision, the bot evaluates its hand for trick-winning potential **relative to a candidate trump suit**.

### Per-Suit Strength (if that suit were trump)

```
trump_tricks = count of trump cards ranked 10+
             + 0.5 per trump ranked 7–9
side_tricks  = count of Aces in non-trump suits
             + 0.5 per guarded King (King with 2+ other cards in suit)
             + 0.5 per void suit (future trumping opportunity)
estimated_tricks = trump_tricks + side_tricks
```

The bot evaluates this for all 4 suits and picks the one with the highest `estimated_tricks`.

### Best Suit Selection

```
for each suit in [♠, ♥, ♦, ♣]:
    calculate estimated_tricks(suit)
best_trump = suit with max estimated_tricks
best_estimate = estimated_tricks(best_trump)
```

---

## 2. Support Signal Strategy

When partner asks for support, the bot evaluates its hand and responds:

| Condition | Response |
|---|---|
| `estimated_tricks >= 4` (with partner's likely trump) | **Major** |
| `estimated_tricks >= 1` | **Minor** |
| `estimated_tricks < 1` | **Pass** |

When deciding whether to **ask** for support: the bot asks when its own `best_estimate` is in the range 5–7 (borderline bid — partner's input matters). If `best_estimate >= 8`, bid without asking. If `best_estimate < 5`, pass without asking.

---

## 3. Bidding Strategy

### Pass or Bid Decision

```
if best_estimate >= 10:
    bid best_estimate with best_trump
elif best_estimate >= 9 AND partner_signal == "Minor":
    bid 10 with best_trump
elif best_estimate >= 8 AND partner_signal == "Major":
    bid 10 with best_trump
elif best_estimate >= 7 AND partner_signal == "Major":
    bid 10 with best_trump (aggressive)
else:
    pass
```

### Forced Bid (all passed, must bid ≥8)

The bot is forced to bid. It:
1. Asks partner for support (if not already done).
2. Picks `best_trump` from hand evaluation.
3. Bids `max(8, min(best_estimate, 13))`.
4. If `best_estimate >= 10`: the hand-reveal and partner-control rules kick in.

### Bid Increase (after seeing partner's hand, bid ≥10)

After seeing partner's hand, the bot re-evaluates with full knowledge of 26 cards:

```
combined_estimate = count_sure_tricks(own_hand, partner_hand, trump)
if combined_estimate > current_bid:
    increase bid to min(combined_estimate, 13)
else:
    keep current bid
```

**Bid 13 risk assessment**: Only increase to 13 if `combined_estimate == 13` (all tricks certain) OR if the scoring situation makes it strategically necessary (e.g., need to force a dealer change to protect a teammate from losing).

---

## 4. Trump Suit Selection

The bot chooses trump based on:

1. **Primary**: Suit with the most cards AND highest cards (maximizes trump tricks).
2. **Tiebreaker**: Suit where partner signaled "Major" (if partner's likely strength aligns).
3. **Avoid**: Suits with ≤2 cards (too few trumps to control the round).

After seeing partner's hand (bid ≥10), re-evaluate: the best trump is the suit where the **combined 26 cards** have the strongest presence.

---

## 5. Card Play Strategy

### 5a. Leading a Trick

**When below bid target (need more tricks):**
- Lead **Aces in non-trump suits** first — safe tricks that can't be beaten (except by trump).
- Lead **short suits** (1–2 cards) to create voids for future trumping.
- Lead **high trump** if holding A/K of trump — flush out opponent trump.

**When at or above bid target (round should end soon):**
- The round ends automatically when the target is reached, so this state is brief.
- Lead whatever card closes the round fastest.

**When defending (trying to break the bid):**
- Lead suits where the bidding team is likely weak.
- Lead trump to deplete the bidder's trump supply.
- Coordinate with partner to maximize combined tricks.

### 5b. Following Suit

| Situation | Action |
|---|---|
| Partner is winning the trick | Play **lowest card** in suit (don't waste a winner). |
| Partner is NOT winning | Play **lowest card that wins**, if possible. Otherwise play lowest (concede). |
| Opponent is winning, can't beat them | Play **lowest card** (don't waste high cards). |

### 5c. Void in Led Suit

| Situation | Action |
|---|---|
| Partner is NOT winning | **Trump** with lowest winning trump. |
| Partner IS winning | **Sluff** lowest card from longest non-trump suit. |
| Opponent trumped, can over-trump | Over-trump only if the trick matters (below target). |
| Don't have trump either | Sluff lowest card from longest suit. |

### 5d. Playing as Bidder with Partner Control (bid ≥10)

The bot controls both hands (26 cards). Strategy shifts to optimization:

- **Plan the entire round** — with 26 known cards and knowledge of trump, map out a trick-by-trick plan.
- **Lead from the hand with stronger cards** in the led suit.
- **Use partner's hand to trump** when the bot's own hand is void.
- **Protect high cards** — lead low from one hand to draw out opponents, then win with the other hand.
- **Count opponent cards** — with 26 of 52 known, infer what opponents hold.

---

## 6. TRAM Decision

The bot considers calling TRAM when:

```
remaining_needed = target - tricks_won
remaining_cards = 13 - tricks_played (per player)
```

### When to Claim

1. Holding all remaining trump cards higher than any opponent could have.
2. Holding Aces in all remaining suits AND no opponent can trump those suits.
3. All remaining cards in the bot's hand (and partner's, if controlled) are provably unbeatable.

### TRAM Card Selection

1. Order cards to **lead trump first** (flush out any remaining opponent trump).
2. Then lead Aces in side suits.
3. Then lead remaining winners.

### When NOT to Claim

- If any opponent might hold a higher trump.
- If any opponent might be void in a led suit and could trump.
- If uncertain about opponent hand distribution.
- Conservative default: only claim when the math is certain.

---

## 7. Score-Aware Strategy

The bot adjusts strategy based on the dealer's score and game state:

### As Dealer's Team (want score LOW)

- **Score near 52**: Bid aggressively to reduce score (making your bid = −X to score).
- **Score near 0**: Play conservatively — don't risk a failed bid that would spike the score.
- **Opponent bidding**: Try hard to break their bid (if they make it, score goes up).

### As Non-Dealer's Team (want dealer score HIGH)

- **Bid confidently**: Making your bid pushes dealer score up (+X).
- **Don't fail bids**: Failing gives the dealer a −2X bonus (very bad for you).
- **When defending**: Let the dealer's team make their bid (it reduces their score — bad for you). Actually, PREVENT them — if they make their bid, their score goes DOWN which is good for them.

### Bid 13 Decision

Consider bidding 13 when:
- Combined hand estimate = 13 (after seeing partner's hand).
- Need to force a dealer change to protect a teammate from a future loss.
- The current dealer's score is already high and a regular bid won't change the outcome.

---

## 8. Decision Priority Order

When choosing a card to play:

1. **Round-closing play** — if this trick wins the round (reaches target), play the winner.
2. **TRAM opportunity** — if remaining cards are all winners, call TRAM instead of playing.
3. **Take tricks when below target** — play to win.
4. **Defend against opponent's bid** — take tricks to push opponents below their target.
5. **Default discard** — play lowest card of longest non-trump suit.
