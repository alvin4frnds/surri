# Screen 7 — TRAM Claim

Full-screen overlay on top of the game board. Player selects cards and orders them to claim the remaining needed tricks.

---

## 7a — Card Selection (standard bid, local player's own hand only)

```
┌─────────────────────────┐
│  ✕  TRAM CLAIM          │  ← Close / cancel button (top left)
│                         │
│  ┌─────────────────────┐│
│  │ You need 3 more     ││  ← How many tricks the claiming team still needs
│  │ tricks to close.    ││
│  │ Select 3 cards in   ││
│  │ the order you'd     ││
│  │ play them.          ││
│  └─────────────────────┘│
│                         │
│  ── PLAY ORDER ──────── │
│                         │
│  ┌──────┐ ┌──────┐ ┌──┐ │
│  │  1   │ │  2   │ │+3│ │  ← Ordered slots; tap a card below to fill slots
│  │  A♥  │ │  A♠  │ │  │ │     "+" = empty slot
│  └──────┘ └──────┘ └──┘ │
│                         │
│  (tap a slot to remove) │
│                         │
│  ── YOUR HAND ───────── │
│                         │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐  │
│  │A♥││A♠││K♥││9♦││5♣│  │  ← Full hand; tapping adds to next empty slot
│  └──┘└──┘└──┘└──┘└──┘  │     Already-selected cards are dimmed
│  ┌──┐┌──┐              │
│  │7♦││3♣│              │
│  └──┘└──┘              │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │   CLAIM TRAM  ▶   │  │  ← Enabled only when all required slots filled
│  └───────────────────┘  │
└─────────────────────────┘
```

---

## 7b — Card Selection (bid ≥10, bidder controls partner's hand too)

Same layout, but hand area is split into two rows:

```
│  ── YOUR HAND ───────── │
│  ┌──┐┌──┐┌──┐┌──┐       │
│  │A♥││A♠││K♥││9♦│       │  ← Bidder's own cards
│  └──┘└──┘└──┘└──┘       │
│                         │
│  ── JORDAN'S HAND ───── │
│  ┌──┐┌──┐┌──┐           │
│  │Q♥││J♠││6♦│           │  ← Partner's cards (also selectable)
│  └──┘└──┘└──┘           │
```

---

## 7c — Result: Valid Claim

```
┌─────────────────────────┐
│                         │
│        ✓ TRAM!          │  ← Large success indicator
│                         │
│  Your team claimed the  │
│  remaining 3 tricks.    │
│                         │
│  Round over.            │
│                         │
│  [auto-dismiss → Round  │
│   Summary screen]       │
│                         │
└─────────────────────────┘
```

---

## 7d — Result: Invalid Claim

```
┌─────────────────────────┐
│                         │
│        ✗ INVALID        │  ← Red / error indicator
│                         │
│  Your TRAM was          │
│  challenged.            │
│                         │
│  All remaining tricks   │
│  go to the other team.  │
│                         │
│  Round over.            │
│                         │
│  [auto-dismiss → Round  │
│   Summary screen]       │
│                         │
└─────────────────────────┘
```

---

## Notes

- The number of required slots = `target − tricks_already_won` for the claiming team
- Cancelling TRAM (✕) returns to the game board with no penalty
- The order of cards matters — the server validates each card in sequence
- Cards can be reordered by tapping a filled slot to remove it, then re-selecting
