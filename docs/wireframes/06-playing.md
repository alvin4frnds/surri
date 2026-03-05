# Screen 6 — Playing Phase

The main interactive game board. Based on the base layout from Screen 3, now fully live.

---

## 6a — Standard Play (bid < 10, or local player is not the bidder)

```
┌─────────────────────────┐
│  ┌──────┐   ┌─────────┐ │
│  │ ♥  10│   │Score: 24│ │  ← Trump ♥, dealer score
│  └──────┘   └─────────┘ │
│                         │
│         ┌───────┐       │
│         │NORTH  │       │
│         │Jordan │       │
│         │trk: 2 │       │
│         └───────┘       │
│                         │
│  ┌──────┐     ┌──────┐  │
│  │WEST  │     │EAST  │  │
│  │Sam   │     │Riley │  │
│  │trk:1 │     │trk:1 │  │
│  └──────┘     └──────┘  │
│                         │
│          [K♣]           │  ← North played K♣
│   [3♠]         [J♣]    │  ← West / East played
│          [ ]            │  ← South hasn't played yet (empty slot, pulsing)
│                         │
│         ┌───────┐       │
│         │SOUTH  │       │
│         │ Alex  │       │
│         │trk: 2 │       │
│         └───────┘       │
│                         │
│  ┌─────────────────────┐│
│  │ Bid: 10♥  Us: 4/10  ││  ← Bid progress
│  │           Them: 1/4 ││
│  └─────────────────────┘│
│                         │
│ [TRAM]        Your turn │  ← TRAM button + "Your turn" prompt
│                         │
│ ┌──────────────────────┐│
│ │ 5♣ [6♣] 8♥ 9♥ J♥ K♥ ││  ← Playable cards full opacity
│ │ A♥  2♠  5♠  7♦  [9♦]││    Unplayable dimmed (must follow ♣, so non-♣ dimmed)
│ └──────────────────────┘│
└─────────────────────────┘
```

---

## 6b — Partner Control (bid ≥10, local player is the bidder)

When it is the **partner's turn** to play, the bidder sees both hands and taps a card from the partner's area.

```
┌─────────────────────────┐
│  ┌──────┐   ┌─────────┐ │
│  │ ♥  10│   │Score: 24│ │
│  └──────┘   └─────────┘ │
│                         │
│  ╔═════════════════════╗ │
│  ║ JORDAN'S HAND       ║ │  ← Partner hand always visible (bid ≥10)
│  ║ 3♥ [7♥] Q♥ 4♠ 6♠  ║ │     Tappable when it's partner's turn
│  ║ A♠  2♦  K♦  5♣     ║ │
│  ╚═════════════════════╝ │
│                         │
│  ┌────────────────────┐  │
│  │  Pick card for     │  │  ← Prompt when it's partner's turn
│  │  Jordan to play    │  │
│  └────────────────────┘  │
│                         │
│  [K♣]   [ ]   [J♣]     │  ← Center area (partner's slot empty)
│          [ ]            │
│                         │
│  ┌─────────────────────┐│
│  │ Bid: 10♥  Us: 4/10  ││
│  │           Them: 1/4 ││
│  └─────────────────────┘│
│                         │
│ [TRAM]                  │
│                         │
│ ┌──────────────────────┐│
│ │ 5♣ 6♣ 8♥ 9♥ J♥ K♥ A♥││  ← Bidder's own hand (not their turn right now)
│ │ 2♠ 5♠ 7♦ 9♦ J♦ A♦   ││     All dimmed since it's partner's turn
│ └──────────────────────┘│
└─────────────────────────┘
```

---

## 6c — Partner's Perspective (bid ≥10, local player is the partner)

The partner sees their hand is exposed and cannot tap their own cards.

```
│  ╔═════════════════════╗ │
│  ║  YOUR HAND (shown   ║ │  ← Notice that hand is public
│  ║  to all players)    ║ │
│  ╚═════════════════════╝ │
│                         │
│  "Alex is choosing      │  ← Status when it's the partner's turn
│   your card…"          │
│                         │
│ ┌──────────────────────┐│
│ │ 3♥  7♥  Q♥  4♠  6♠  ││  ← Partner's hand visible but NOT tappable
│ │ A♠  2♦  K♦  5♣      ││     (bidder controls it)
│ └──────────────────────┘│
```

---

## Trick Resolution

After all 4 cards are played:
1. Winner's card briefly glows / is highlighted (500ms)
2. All 4 cards animate to winner's corner (sweep)
3. Winner's trick counter increments
4. If round ends (bid made / broken): transition to Screen 8 (Round Summary)
5. Otherwise: winner leads next trick

---

## Notes

- **TRAM button**: Always visible during the playing phase; disabled if it's not a valid moment (e.g., before any card is played in the first trick)
- Opponent card backs show a fanned stack above their avatar; count is visible
- Dealer crown shown on the current dealer's avatar at all times
