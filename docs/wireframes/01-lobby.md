# Screen 1 — Lobby / Room Join

Mobile portrait, dark theme. This is the first screen a player sees.

---

```
┌─────────────────────────┐
│                         │
│     ░░░░░░░░░░░░░       │  ← Logo / game title "SURRI"
│       S U R R I         │     (decorative, centered)
│                         │
│                         │
│  ┌───────────────────┐  │
│  │  Your Name        │  │  ← Text input
│  └───────────────────┘  │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │   CREATE ROOM     │  │  ← Primary action button
│  └───────────────────┘  │
│                         │
│           OR            │
│                         │
│  ┌───────────────────┐  │
│  │  Room Code  [GO]  │  │  ← Code input + join button (inline)
│  └───────────────────┘  │
│                         │
│                         │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

---

## CREATE ROOM flow (modal / bottom sheet)

Tapping "Create Room" expands options before creating:

```
┌─────────────────────────┐
│                         │
│     ░░░░░░░░░░░░░       │
│       S U R R I         │
│                         │
│  ┌───────────────────┐  │
│  │  Your Name        │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   CREATE ROOM     │  │
│  └───────────────────┘  │
│                         │
│           OR            │
│                         │
│  ┌───────────────────┐  │
│  │  Room Code  [GO]  │  │
│  └───────────────────┘  │
│                         │
│╔═══════════════════════╗│
│║   Bots to fill seats  ║│  ← Bottom sheet slides up
│║                       ║│
│║   0   1   [2]   3     ║│  ← Segmented control (2 selected)
│║                       ║│
│║  ┌─────────────────┐  ║│
│║  │   START ROOM    │  ║│
│║  └─────────────────┘  ║│
│╚═══════════════════════╝│
└─────────────────────────┘
```

---

## States

| State | Description |
|---|---|
| Name empty | "Create Room" and "GO" buttons are disabled |
| Name filled | Both actions enabled |
| Invalid room code | Red border on code input, "Room not found" below |
| Creating room | Spinner inside "Start Room" button |
| Joining room | Spinner inside "GO" button |

---

## Notes

- Room code is 4 characters (all caps), e.g. `K7XQ`
- Name is persistent (saved locally, pre-filled on return)
- Bot count only applies when creating; joining inherits room's bot setting
- "GO" should trigger on keyboard "Enter" / "Done" action
