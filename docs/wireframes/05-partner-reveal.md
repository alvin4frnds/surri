# Screen 5 — Partner Hand Reveal (Bid ≥10)

Triggered immediately after any bid ≥10 is placed. The bidder's partner's hand is shown to all players. The bidder can increase their bid before starting play.

---

## View: Bidder (local player placed the bid)

```
┌─────────────────────────┐
│  ┌──────┐   ┌─────────┐ │
│  │ ♥    │   │Score: 24│ │  ← Trump now known
│  └──────┘   └─────────┘ │
│                         │
│  ╔═════════════════════╗ │
│  ║  JORDAN'S HAND      ║ │  ← Partner hand label
│  ║                     ║ │
│  ║ 3♥ 7♥ Q♥ 4♠ 6♠ 8♠  ║ │  ← Partner's cards, face-up, not tappable
│  ║ A♠ 2♦ K♦ 5♣ J♣     ║ │
│  ╚═════════════════════╝ │
│                         │
│  ┌─────────────────────┐│
│  │  You bid 10 ♥       ││  ← Current bid summary
│  │  Increase bid?      ││
│  └─────────────────────┘│
│                         │
│  ┌──┐               ┌──┐│
│  │ < │   BID: 10    │ > ││  ← Bidder can only increase (< is disabled at current bid)
│  └──┘               └──┘│
│         range: 10–13    │
│                         │
│  ┌───────────────────┐  │
│  │      START ▶      │  │  ← Confirms bid and begins playing phase
│  └───────────────────┘  │
│                         │
│ ┌──────────────────────┐│
│ │ 5♣ 6♣ 8♥ 9♥ J♥ K♥ A♥││  ← Bidder's own hand (read-only here)
│ │ 2♠ 5♠ 7♦ 9♦ J♦ A♦   ││
│ └──────────────────────┘│
└─────────────────────────┘
```

---

## View: Non-Bidder (any other player watching)

Same layout, but:
- No bid picker controls
- No START button
- Shows "Waiting for [bidder name] to start…" instead

```
│  ╔═════════════════════╗ │
│  ║  JORDAN'S HAND      ║ │
│  ║ 3♥ 7♥ Q♥ 4♠ 6♠ 8♠  ║ │
│  ║ A♠ 2♦ K♦ 5♣ J♣     ║ │
│  ╚═════════════════════╝ │
│                         │
│  ┌─────────────────────┐│
│  │  Alex bid 10 ♥      ││
│  │  Waiting for Alex…  ││
│  └─────────────────────┘│
```

---

## Notes

- The revealed hand is displayed to **all 4 players** simultaneously
- The bidder can only **increase** the bid, never decrease
- Increasing to 13 activates bid-13 rules (instant win/lose outcome)
- Tapping START locks in the bid and transitions to the playing phase (Screen 6)
- If the local player is the **partner** whose hand was revealed: their hand area at the bottom still shows their cards normally (for context), but a "Your hand is revealed" notice appears
