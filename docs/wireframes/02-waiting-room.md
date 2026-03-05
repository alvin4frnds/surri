# Screen 2 — Waiting Room

After creating or joining a room. Host waits for others; joining players land here directly.

---

```
┌─────────────────────────┐
│  ←                      │  ← Back / leave room
│                         │
│      ROOM CODE          │
│    ┌───────────┐        │
│    │  K 7 X Q  │  [Copy]│  ← Tap to copy to clipboard
│    └───────────┘        │
│                         │
│ ┌─────────────────────┐ │
│ │  👤  Alex (you)     │ │  ← Seat 0 — local player, always filled
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  👤  Jordan         │ │  ← Seat 1 — joined human
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  🤖  Bot            │ │  ← Seat 2 — bot placeholder
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  ·  ·  ·  Waiting…  │ │  ← Seat 3 — empty, animated dots
│ └─────────────────────┘ │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │   START GAME  ▶   │  │  ← Host only; enabled when all seats
│  └───────────────────┘  │     have a human or bot
│                         │
│  Non-host sees:         │
│  "Waiting for host…"    │
│                         │
└─────────────────────────┘
```

---

## States

| Seat state | Display |
|---|---|
| Local player | Name + "(you)" badge |
| Human joined | Their name |
| Bot (auto-fill) | "🤖 Bot" |
| Empty, waiting | Animated dots + "Waiting…" |

## Notes

- Only the **host** (room creator) sees the Start button
- Start is disabled until no seat is "Waiting…" (all filled by human or bot)
- Bots auto-fill empty seats based on the bot count chosen at creation; extra waiting slots mean the host expects more humans
- If a human joins, a bot is removed to make room (FIFO)
- Teams are shown after game starts, not here (keep it simple)
