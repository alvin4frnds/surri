# Screen 9 — Game Over

Shown when 3 unique players have each lost at least once. The 4th player (zero losses) wins.

---

```
┌─────────────────────────┐
│                         │
│                         │
│       🏆  WINNER        │  ← Trophy / celebration
│                         │
│    ╔═══════════════╗    │
│    ║               ║    │
│    ║     ALEX      ║    │  ← Winner's name, large
│    ║  never lost!  ║    │
│    ║               ║    │
│    ╚═══════════════╝    │
│                         │
│                         │
│  ── Final Standings ─── │
│                         │
│  👤 Alex      0 losses  │  ← Winner (0 losses)
│  👤 Jordan    1 loss    │
│  👤 Sam       2 losses  │
│  👤 Riley     1 loss    │
│                         │
│                         │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │    PLAY AGAIN     │  │  ← Returns to waiting room (same players)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    LEAVE ROOM     │  │  ← Returns to lobby (Screen 1)
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

---

## Notes

- "Play Again" keeps the same room and players; resets all scores, losses, and dealer
- "Leave Room" disconnects the player; remaining players can continue or also leave
- If the winner is the local player, a more prominent celebration effect is shown
- Bot players show their bot icon instead of the person emoji
