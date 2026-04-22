# Socket.io Event API

This is the agreed contract between server and client. Both sides must implement this exactly.

## Card Format

`"{rank}{suit}"` — e.g. `"AH"` (Ace Hearts), `"10S"` (Ten Spades), `"2D"` (2 Diamonds), `"KC"` (King Clubs)

Ranks: `2 3 4 5 6 7 8 9 10 J Q K A`
Suits: `S H D C`

## Client → Server

| Event | Payload | When |
|---|---|---|
| `create_room` | `{ name, botCount }` | Lobby |
| `join_room` | `{ name, code }` | Lobby |
| `start_game` | `{}` | Waiting room (host only) |
| `ask_support` | `{}` | Bidding, player's turn |
| `give_support` | `{ signal: 'Major'\|'Minor'\|'Pass' }` | Partner asked for support |
| `place_bid` | `{ bid, trump }` | Bidding, player's turn |
| `pass_bid` | `{}` | Bidding, player's turn |
| `raise_bid` | `{ bid, trump }` | Overbid window, player's turn |
| `pass_raise` | `{}` | Overbid window, player's turn |
| `increase_bid` | `{ bid }` | Partner reveal phase |
| `takeover_seat` | `{ name, seat }` | Spectator claiming an offered (or any claimable) bot seat |
| `leave_spectator` | `{}` | Spectator wants to stop watching |
| `start_play` | `{}` | Partner reveal phase (bidder only) |
| `play_card` | `{ card }` | Playing phase, player's turn |
| `call_tram` | `{ cards: string[] }` | Playing phase (ordered claim) |

## Server → Client

| Event | Payload | When |
|---|---|---|
| `room_created` | `{ code, seat, state: RoomState }` | After create_room |
| `room_joined` | `{ seat, state: RoomState }` | After join_room (game not yet started) |
| `room_updated` | `{ state: RoomState }` | Any seat changes |
| `game_state` | `{ state: GameState }` | After every game action |
| `takeover_success` | `{ seat, roomCode, gameState, roomState }` | After join_room routed to takeover, or after explicit takeover_seat |
| `spectate_joined` | `{ roomCode, roomState, gameState }` | After join_room routed to spectator |
| `spectator_seat_offer` | `{ seat }` | A seat opened and this spectator is next in the queue |
| `rejoin_available` | `{}` | join_room hit a pending reconnect for this playerId — client should emit rejoin_room |
| `error` | `{ message }` | Invalid action |

### Started-room `join_room` routing

When a client emits `join_room` for a room where `gameStarted === true`, the server does **not** reject — instead it routes the socket through one of three paths and replies with the matching event:

1. Pending reconnect for this playerId → `rejoin_available`. Client should emit `rejoin_room`.
2. At least one claimable bot seat (bot, not in grace period) → auto-takeover → `takeover_success`.
3. Otherwise → spectator → `spectate_joined`. The socket joins the room's socket.io channel and receives filtered `game_state` broadcasts thereafter.

### URL conventions

- Canonical room URL: `/r/{CODE}` (e.g. `https://surri.xuresolutions.in/r/ABCD`).
- Legacy alias `/join/{CODE}` is still accepted and silently normalized to `/r/{CODE}` by the client on landing.
- The client pushes `/r/{CODE}` on entering a room, clears to `/` on leave.
- Browser back/forward reconciles URL into app state (spec-004 §4a).

## RoomState

```js
{
  code: string,
  seats: [{ name: string|null, isBot: boolean, isConnected: boolean }], // index = seat 0-3
  hostSeat: number,
  gameStarted: boolean,
}
```

## GameState

Server sends a **tailored state** per player (private hand data filtered per recipient).

```js
{
  phase: 'dealing' | 'bidding' | 'bidding_forced' | 'bidding_raise' | 'partner_reveal' | 'playing' | 'scoring',

  // Players
  seats: [{ name, isBot, isConnected, losses }],  // index = seat
  mySeat: number,
  dealer: number,          // seat index of current dealer (has crown)
  dealerScore: number,     // the one score that matters (high = bad, >=52 = lose)
  round: number,

  // Bidding
  trump: null | 'S' | 'H' | 'D' | 'C',
  bid: null | number,
  biddingSeat: null | number,
  biddingTeam: null | 0 | 1,   // team 0 = seats 0&2, team 1 = seats 1&3
  bidHistory: [{ seat, action: 'bid'|'pass'|'raise'|'pass_raise', bid?, trump? }],
  supportSignals: { 0: null|'Major'|'Minor'|'Pass', 1: null, 2: null, 3: null },
  supportAsked: { 0: boolean, 1: boolean, 2: boolean, 3: boolean },

  // Playing
  activeSeat: null | number,   // whose turn it is
  tricks: { 0: 0, 1: 0, 2: 0, 3: 0 },  // tricks won this round per seat
  currentTrick: [{ seat, card }],        // cards played so far this trick
  lastTrick: null | { winner: number, cards: [{ seat, card }] },

  // Private (per-player)
  myHand: string[],           // this player's cards only
  partnerHand: null | string[], // partner's cards (visible when bid >= 10)
  handSizes: { 0: 13, 1: 13, 2: 13, 3: 13 },  // remaining card counts

  myTurn: boolean,
  playableCards: string[],    // legal cards to play (enforces follow-suit)

  // Round result (only in 'scoring' phase)
  lastRoundResult: null | {
    biddingSeat, bid, trump,
    biddingTeamTricks, defendingTeamTricks,
    made: boolean,
    scoreDelta: number,
    newScore: number,
    dealerChanged: boolean,
    newDealer: null | number,
    dealerChangeReason: null | 'score_overflow' | 'score_negative' | 'bid13',
    loser: null | number,   // seat that took a loss
    gameOver: boolean,
    winner: null | number,
  }
}
```

## Teams

- Team 0: seats 0 and 2
- Team 1: seats 1 and 3
- Partners: `(seat + 2) % 4`
- Dealer team: team containing the dealer seat
