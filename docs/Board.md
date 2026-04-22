# Board Layout & UI

This document describes the visual layout and UI states for Surri. See [GameFlow.md](GameFlow.md) for game rules.

---

## Table Layout

Portrait orientation, dark-themed background. 4 player positions fixed around a central play area.

```
              ┌─────────────┐
              │   NORTH     │  ← Partner (of South)
              │  (avatar)   │
              │  tricks: X  │
              └─────────────┘
                    ▲
    ┌────────┐      │      ┌────────┐
    │  WEST  │      │      │  EAST  │
    │(avatar)│      │      │(avatar)│
    │tricks:X│      │      │tricks:X│
    └────────┘      │      └────────┘
                    │
      [Center Play Area — 4 cards]
          [TRUMP INDICATOR: ♥]
                    │
              ┌─────────────┐
              │   SOUTH     │  ← Local player (you)
              │  (avatar)   │
              │  tricks: X  │
              └─────────────┘
         [Player Hand — face-up cards]
```

### Player Positions

| Position | Seat | Relationship |
|---|---|---|
| South (bottom) | 0 | Local player |
| West (left) | 1 | Opponent |
| North (top) | 2 | Partner of South |
| East (right) | 3 | Opponent |

Teams: **South + North** (seats 0 & 2) vs **West + East** (seats 1 & 3)

### Player Area (per seat)

- **Avatar / icon**
- **Player name**
- **Dealer indicator** — visible on the current dealer's avatar (critical for scoring context)
- **Tricks won** counter — updates after each trick
- **Loss counter** — small badge showing how many times this player has lost

---

## Persistent Info Bar

Always visible during play:

- **Trump suit** — prominently displayed (changes each round)
- **Dealer score** — the single score that matters (0–51 range, high = bad)
- **Bid** — current round's bid value and which team is bidding
- **Trick progress** — bidding team: `X / bid`, defending team: `X / (14 − bid)`

---

## Bidding UI

### Phase 1 — Pass or Bid (sequential, clockwise)

When it's the local player's turn to bid:

1. **Support button**: "Ask Partner" — triggers partner support signal.
   - Partner responds: **Major** / **Minor** / **Pass** (shown as speech bubble above partner's avatar).
   - Visible to all players.
2. **Pass button**: Skip to next player.
3. **Bid controls**:
   - **Trump suit selector**: 4 suit buttons (♠ ♥ ♦ ♣).
   - **Bid number**: Picker from 10 to 13.
   - **Confirm button**: "Bid [X] [suit]".

For other players (AI or remote): their action appears as a speech bubble — "Pass" or "Bid 10 ♥".

### Phase 1b — Forced Bid (all passed)

Same UI as above, but:
- Pass button is **disabled** (must bid).
- Bid number picker range: **8 to 13**.
- Support button still available.

### Phase 1c — Overbid Window (bid ≥10, other seats act)

After any bid ≥10 lands, the bidding panel switches into **Overbid** mode for the other three seats (clockwise from the bidder). Each seat gets one action: **Pass** or **Raise**.

- Header label: "Overbid".
- Top strip: "Current bid: 10 ♠ by Alice" + "Waiting for Bob to raise or pass…" when it's not the local player's turn.
- On the active seat's screen: **Pass** button (full-width), an "or raise" divider, a suit selector (defaulted to the current trump — saves a tap), a bid-number picker starting at `currentBid + 1`, and a **RAISE** confirm button in amber.
- Bid history shows raises with an up-arrow prefix (⇧) in amber; pass-raises in slate-400.
- Partner hand remains **hidden** on every client during this phase — it only flips face-up after the window closes.

Window closes when all three seats have acted (whether they raised or passed). Control then passes to Phase 2 for the **final** bidder.

### Phase 2 — Partner Hand Reveal (bid ≥10 only)

After the overbid window closes with a final bid ≥10:

1. **Partner's hand** is displayed face-up to **all players** (separate hand area above the board or overlaid).
2. **Bid increase controls**: Bidder can raise the bid (10 → 11 → 12 → 13). Cannot decrease.
3. **"Start" button**: Bidder confirms and begins play.

---

## Playing Phase UI

### Card Hand

- Local player's hand displayed at **bottom of screen**, face-up.
- Cards sorted by **suit, then rank**.
- **Playable cards**: fully visible, tappable.
- **Unplayable cards**: dimmed/grayed (wrong suit when follow-suit required).

### Bid ≥10 — Partner Hand Control

When the local player is the bidder with bid ≥10:
- **Partner's hand** is visible alongside or above the local player's hand.
- On the partner's turn, the bidder taps a card from the partner's hand to play it.
- The partner's client shows a "waiting for bidder" state.

### Center Play Area

4 cards in a diamond layout, one per player position:

```
         [North card]
[West card]         [East card]
         [South card]
```

Cards appear as each player plays. After trick resolution, the winner is briefly highlighted, then cards are swept.

### TRAM UI

A **"TRAM" button** is available during the playing phase:

1. Tapping opens a card selection overlay.
2. Player selects cards from their hand (and partner's hand if bid ≥10) and **arranges them in play order** (drag to reorder).
3. **"Claim" button** submits the TRAM to the server for validation.
4. Result:
   - **Valid**: Animation showing tricks claimed. Round ends.
   - **Invalid**: Warning flash. All remaining tricks awarded to opponents. Round ends.

---

## Scoring / Round Summary

Shown as an overlay after each round:

- **Who bid**: Team name, bid value, trump suit
- **Tricks taken**: bidding team vs defending team
- **Outcome**: "Made" or "Failed"
- **Score change**: +X or −X applied to dealer's score
- **New score**: Updated dealer score
- **Dealer change?**: If triggered, show who the new dealer is and why (loss, negative, bid-13)
- **Loss counter update**: If a player lost, highlight their incremented counter

For **bid 13 rounds**: special overlay — "ALL OR NOTHING — [Team] wins/loses!"

---

## Game End Screen

- **Winner announcement**: The player who never lost
- **Loss counter summary**: Each player's total losses
- **Play again** / **Leave room** buttons

---

## UI States Summary

| State | Screen |
|---|---|
| Lobby / Room join | Player name entry, room code, bot count selector, theme switcher |
| Lobby — offline | Create/Join buttons are **hidden** (not disabled); single "Offline — reconnecting…" message in the button area. No retry button. The lobby re-renders the normal buttons once socket.io auto-reconnects. |
| Spectator view | Same GameBoard layout but no hand-bottom, no bid/play/give-up controls. Top strip reads "Spectating — waiting for a seat to open". "Stop watching" button (top-right) replaces "Quit game". |
| Spectator — seat offer | Modal: "A seat opened up. Seat N is yours if you want it." Two buttons — "No thanks" / "Take seat". Confirming emits `takeover_seat`. |
| Waiting for players | Connected players shown, empty seats labeled "Bot" |
| Dealing | Cards animate to each player position |
| Support signal | Speech bubble exchange above avatars (visible to all) |
| Bidding — pass/bid | Bid controls for active player; speech bubbles for others |
| Bidding — forced | Same as above, pass disabled, range starts at 8 |
| Partner hand reveal | Partner's cards shown to all; bid increase + Start button |
| Playing | Full board, hand visible, center area active |
| Playing — partner control | Bidder sees both hands; taps partner's cards on partner's turn |
| TRAM claim | Card selection overlay with ordering |
| Trick resolved | Brief highlight of winner before sweep |
| Round scoring | Score summary overlay |
| Dealer change | Transition animation showing new dealer |
| Game over | Winner, loss counters, play again option |
