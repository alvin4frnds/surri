# Screen 8 — Round Summary

Overlay shown after every round ends (bid made, bid broken, or TRAM resolved). Dismisses automatically or on tap.

---

## 8a — Standard Round (no dealer change)

```
┌─────────────────────────┐
│                         │
│  ╔═════════════════════╗ │
│  ║   ROUND SUMMARY     ║ │
│  ╠═════════════════════╣ │
│  ║                     ║ │
│  ║  Jordan bid 10 ♥    ║ │  ← Who bid, what, which trump
│  ║                     ║ │
│  ║  Us (Jordan+Alex)   ║ │
│  ║  ████████░░  8 /10  ║ │  ← Tricks taken / bid — progress bar
│  ║                     ║ │
│  ║  Them (Sam+Riley)   ║ │
│  ║  ████░░░░░░  4 / 4  ║ │  ← Defense made their counter-target
│  ║                     ║ │
│  ║  ✗ BID FAILED       ║ │  ← Outcome (✓ BID MADE or ✗ BID FAILED)
│  ║                     ║ │
│  ╠═════════════════════╣ │
│  ║  Score change       ║ │
│  ║  24  →  44          ║ │  ← Old score → new score (animated)
│  ║     + 20            ║ │     (+2X because bid failed and they're non-dealer)
│  ╠═════════════════════╣ │
│  ║  Dealer: Sam  👑    ║ │  ← Same dealer continues
│  ╚═════════════════════╝ │
│                         │
│  ┌───────────────────┐  │
│  │   NEXT ROUND  ▶   │  │  ← Tap to continue (or auto after ~3s)
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

---

## 8b — Dealer Change (score ≥52 or negative)

Additional section appended below the score change:

```
│  ╠═════════════════════╣ │
│  ║  ⚠  DEALER CHANGE   ║ │
│  ║                     ║ │
│  ║  Sam's score hit 52 ║ │  ← Reason (score ≥52 / went negative)
│  ║  Sam takes a loss   ║ │
│  ║  Loss count: Sam 1  ║ │
│  ║                     ║ │
│  ║  Score resets to 0  ║ │
│  ║  New dealer: Riley  ║ │  ← Partner becomes dealer (score ≥52 case)
│  ╚═════════════════════╝ │
```

For **negative score**:
```
│  ║  Score went negative  ║ │
│  ║  Score → 8 (absolute) ║ │
│  ║  New dealer: Alex     ║ │  ← Next clockwise, no loss recorded
```

---

## 8c — Bid 13 Round

Replaces the standard summary entirely:

```
│  ╔═════════════════════╗ │
│  ║  ⚡  BID OF 13      ║ │
│  ╠═════════════════════╣ │
│  ║                     ║ │
│  ║  Alex bid 13 ♠      ║ │
│  ║  ALL OR NOTHING     ║ │
│  ║                     ║ │
│  ║  Alex + Jordan:     ║ │
│  ║  13 tricks  ✓ MADE  ║ │
│  ║                     ║ │
│  ╠═════════════════════╣ │
│  ║  Sam + Riley LOSE   ║ │
│  ║  Loss count: Sam 2  ║ │
│  ║                     ║ │
│  ║  Score resets to 0  ║ │
│  ║  New dealer: Riley  ║ │  ← Per bid-13 dealer rotation table
│  ╚═════════════════════╝ │
```

---

## Notes

- The score change animates (number counts up/down)
- Loss counter badge on the affected player's avatar updates before the overlay dismisses
- Auto-dismiss after ~4 seconds; tap anywhere to dismiss early
- If 3 unique players now have ≥1 loss: transition to Screen 9 (Game Over) instead of next round
