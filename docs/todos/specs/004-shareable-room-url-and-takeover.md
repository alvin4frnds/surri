# Spec 004 — Shareable Room URL + Mid-Game Seat Takeover + Spectator Mode

**Status**: Reviewed — core approach approved; multi-device/multi-tab edge cases need a second pass before implementation
**Authored**: 2026-04-19
**Touches**: `server/server.js`, `client/src/App.vue`, `client/src/components/{WaitingRoom,GameBoard,LobbyScreen}.vue`, `docs/SocketAPI.md`

---

## 1. Problem

Three related shortcomings today, addressed together because they share infrastructure:

1. **No persistent room URL**. `WaitingRoom.vue:14` constructs a share link `{origin}/join/{code}`, but `App.vue:23` immediately calls `history.replaceState({}, '', '/')` after reading it. Once in a room, the URL shows `/` — you can't bookmark, refresh, or share your current session. Browser back/forward does nothing useful.
2. **Join is blocked after game start**. `server.js:372–373` rejects any `join_room` with "Game already started". There is no path for a new human to replace a bot mid-round — even if the bot seat was a human who rage-quit 20 minutes ago.
3. **No spectator mode**. If all four seats are occupied by connected humans, a URL-visitor has no recourse. The only server path for a non-seated socket today is to go back to the lobby.

## 2. Proposed Change — three coordinated pieces

### 2a. Persistent room URL

- The URL reflects the current room the user is in: `/r/{CODE}` (e.g. `https://surri.xuresolutions.in/r/ABCD`).
- Pushed on entering a room (`room_created`, `room_joined`, `spectate_joined`) via `history.pushState`.
- Cleared back to `/` on `leave`.
- Legacy `/join/{CODE}` links continue to work — on landing, the client issues a `replaceState` to `/r/{CODE}` for consistency.
- Browser refresh on `/r/ABCD` re-attempts to enter the room using the saved `surri_playerId` + `surri_name` from `localStorage`. If no saved name, it falls through to the lobby with the code prefilled (existing `initialCode` path in `App.vue:142`).

### 2b. Mid-game seat takeover

When a new human visits a room URL and the game has already started, they can claim any seat that is:

- **Currently a bot** (`seat.isBot === true`), AND
- **Not in grace period** (`seat.isTempBot !== true`) — a disconnected human keeps their seat protected for 5 minutes (existing mechanism, `server.js:830–861`).

The new human inherits the bot's seat — same position, same hand, same score, same everything in `game.*` — only `seat.isBot`, `seat.socketId`, `seat.isConnected`, `seat.name`, `seat.playerId` flip. The bot's in-flight decision loop stops naturally (`runBotTurns` exits on next iteration per `server.js:133`).

Selection policy for "which seat to claim":
- **Auto-pick**: server picks the lowest-indexed claimable seat and hands it to the visitor. Simplest flow — the visitor just lands in the game.
- Manual-pick UI (spectator clicking a specific seat) is a v2 enhancement; flag in Open Questions.

### 2c. Spectator mode

When all four seats are non-claimable (all connected humans, or all bots that are all in grace-period-tempBot), the visitor joins as a **spectator**:

- No seat assigned. Socket is in the room's socket.io room, receives a **filtered** `game_state` with all hands hidden (except publicly-revealed ones per existing rules: bid-≥10 partner hand, TRAM cards played, trick history).
- Spectator UI: same `GameBoard` layout, all four hand spots show card backs. Header strip: "Spectating — waiting for a seat to open".
- **Auto-promote**: when any seat becomes claimable (a bot exits grace period, or a human disconnects and grace expires), the server automatically promotes the first waiting spectator. The spectator's view flips from "spectating" to "you are now seat X" with a notification.
- Spectator can leave freely (`leave_spectator`); no grace period for spectators.

### 2d. What stays the same

- Room code generation, `/api/stats`, `/dashboard`, game logic, AI, scoring — unchanged.
- 5-min grace period for disconnected humans — unchanged. Critical: spec 004 explicitly **preserves** this; the original human has priority until grace expires.
- `playerId`-based auto-rejoin flow (`server.js:720–798`) — unchanged. Still fires first when a page reload lands on `/r/ABCD` and the playerId matches a pending reconnect.
- `rejoin_room` handler — unchanged. Takeover is a **separate** new handler (`takeover_seat`), not a modification of rejoin.
- Capacitor native app — URL routing isn't meaningful inside a WebView wrapper. Native app flow unchanged; the changes in §3b below are no-ops in native because `window.history.pushState` is benign there.

## 3. Server Changes — `server/server.js`

### 3a. Relax `join_room` — `server.js:365`

Change the "game already started" rejection into a fallthrough:

```js
socket.on('join_room', ({ name, code }) => {
  try {
    code = code?.toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('error', { message: 'Room not found' });

    // Legacy path: game not started → existing empty-seat logic
    if (!room.gameStarted) {
      // ...existing code unchanged (lines 376–406)...
      return;
    }

    // NEW: game started — route to takeover or spectator
    _joinStartedRoom(socket, room, name);
  } catch (err) { /* ... */ }
});
```

### 3b. New helper `_joinStartedRoom(socket, room, name)`

```js
function _joinStartedRoom(socket, room, name) {
  const playerId = socket.playerId;

  // Priority 1: pending-reconnect for this playerId → existing rejoin path.
  // (Clients should call rejoin_room directly, but if they call join_room,
  // be forgiving.)
  if (playerId && pendingReconnects.has(playerId)) {
    const pending = pendingReconnects.get(playerId);
    if (pending.roomCode === room.code) {
      return _performRejoin(socket, pending);  // refactor of existing rejoin_room body
    }
  }

  // Priority 2: takeover a claimable bot seat.
  const claimable = room.seats.findIndex(s =>
    s && s.isBot === true && s.isTempBot !== true
  );
  if (claimable !== -1) {
    return _takeoverSeat(socket, room, claimable, name);
  }

  // Priority 3: spectator.
  return _joinAsSpectator(socket, room);
}
```

### 3c. New function `_takeoverSeat(socket, room, seat, name)`

Mutations (directly modelled on `rejoin_room`, `server.js:755–797`):

```js
function _takeoverSeat(socket, room, seat, name) {
  const seatInfo = room.seats[seat];
  const playerId = socket.playerId;

  // Seat flip — same as rejoin but with a NEW name and NEW playerId.
  seatInfo.isBot = false;
  seatInfo.isTempBot = false;
  seatInfo.socketId = socket.id;
  seatInfo.isConnected = true;
  seatInfo.playerId = playerId;
  seatInfo.name = name;    // overwrite "Bot 2" with the human's name

  if (room.game && room.game.seats[seat]) {
    room.game.seats[seat].isBot = false;
    room.game.seats[seat].isConnected = false ? undefined : true; // always true
    room.game.seats[seat].isTempBot = false;
    room.game.seats[seat].name = name;
  }

  delete room.bots[seat];

  socketToRoom.set(socket.id, { roomCode: room.code, seat });
  if (playerId) playerToRoom.set(playerId, { roomCode: room.code, seat });
  socket.join(room.code);

  console.log(`Takeover: ${name} claimed seat ${seat} in room ${room.code}`);

  const roomState = getRoomState(room);
  socket.emit('takeover_success', {
    seat,
    roomCode: room.code,
    gameState: room.game.getStateFor(seat),
    roomState,
  });

  broadcastGameState(room.code);
  broadcastRoomState(room.code);

  // The bot may have been mid-action. runBotTurns() naturally exits
  // on next iteration because activeSeat is no longer a bot (server.js:133).
  // Nothing to cancel explicitly.
}
```

Critical: if `game.activeSeat === seat` at the moment of takeover, the human sees "it's your turn" immediately on receiving `game_state`. This is the desired behaviour — the bot was about to act, now the human acts instead. See §5 for edge cases.

### 3d. New function `_joinAsSpectator(socket, room)`

Spectators are tracked per room in a new field `room.spectators: Set<socketId>`:

```js
function _joinAsSpectator(socket, room) {
  if (!room.spectators) room.spectators = new Set();
  room.spectators.add(socket.id);
  socketToRoom.set(socket.id, { roomCode: room.code, seat: null, spectator: true });
  socket.join(room.code);

  socket.emit('spectate_joined', {
    roomCode: room.code,
    roomState: getRoomState(room),
    gameState: room.game ? _spectatorGameState(room.game) : null,
  });
}
```

### 3e. Spectator `game_state` filtering — `_spectatorGameState(game)`

Derived from `game.getStateFor(seat)` with all hand data wiped. Pseudocode:

```js
function _spectatorGameState(game) {
  // Start from seat 0's view and null out the personal bits.
  const base = game.getStateFor(0);
  return {
    ...base,
    myHand: [],
    myTurn: false,
    playableCards: [],
    mySeat: null,
    // partnerHand stays as-is: it is already filtered by getStateFor
    // (only populated when bid >= 10, which is public anyway).
  };
}
```

### 3f. Broadcast modification — `broadcastGameState(code)`

Iterate seats as today, then additionally iterate `room.spectators` and emit `_spectatorGameState(room.game)` to each. Extend `server.js:74–78`-ish logic:

```js
function broadcastGameState(code) {
  const room = rooms.get(code);
  if (!room || !room.game) return;
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (s && !s.isBot && s.socketId && s.isConnected) {
      io.to(s.socketId).emit('game_state', { state: room.game.getStateFor(seat) });
    }
  }
  if (room.spectators) {
    const spectatorState = _spectatorGameState(room.game);
    for (const socketId of room.spectators) {
      io.to(socketId).emit('game_state', { state: spectatorState });
    }
  }
}
```

### 3g. Spectator auto-promote

Triggered whenever `isTempBot` flips from true → false (grace expired) OR when a seat becomes `isBot` after a disconnect. A helper:

```js
function _promoteSpectatorIfPossible(room) {
  if (!room.spectators || room.spectators.size === 0) return;
  const claimable = room.seats.findIndex(s =>
    s && s.isBot === true && s.isTempBot !== true
  );
  if (claimable === -1) return;

  // Promote FIFO — Set preserves insertion order.
  const [socketId] = room.spectators;
  room.spectators.delete(socketId);

  const sock = io.sockets.sockets.get(socketId);
  if (!sock) return;  // spectator disconnected

  // Ask them to confirm the takeover rather than silently assign — the UI shows
  // "A seat opened. Claim it?" and they tap to confirm. This is the `spectator_seat_offer`
  // event (see 3h).
  sock.emit('spectator_seat_offer', { seat: claimable });
  // On the client, if the user confirms, they emit `takeover_seat` (3h) with an
  // anonymous ({name: savedName or "Guest"}) — same handler as §3b Priority 2.
}
```

Call sites:
- End of `_joinAsSpectator` (in case a seat is already claimable — shouldn't happen given the priority order, but safe).
- Inside the 5-min grace-expiry timeout callback (`server.js:839–853`), after the seat is flipped.
- Inside any future code path that frees a seat.

### 3h. New dedicated handler `takeover_seat` (explicit, for spectator-initiated)

```js
socket.on('takeover_seat', ({ name, seat }) => {
  const info = socketToRoom.get(socket.id);
  if (!info || !info.spectator) return socket.emit('error', { message: 'Not a spectator' });
  const room = rooms.get(info.roomCode);
  if (!room) return socket.emit('error', { message: 'Room not found' });

  const target = room.seats[seat];
  if (!target || !target.isBot || target.isTempBot) {
    return socket.emit('error', { message: 'Seat not claimable' });
  }

  room.spectators?.delete(socket.id);
  _takeoverSeat(socket, room, seat, name);
});
```

### 3i. 10-second all-bot cleanup — `server.js:874`

Block cleanup when spectators are connected:

```js
const allBots = room.seats.every(s => s?.isBot);
const hasPendingReconnect = room.seats.some(s => s?.isTempBot);
const hasSpectators = (room.spectators?.size ?? 0) > 0;
if (allBots && !hasPendingReconnect && !hasSpectators) {
  // ...existing cleanup...
}
```

Also extend the inner `setTimeout` check at line 878 with the spectator clause.

### 3j. Spectator disconnect cleanup

In the existing `disconnect` handler (`server.js:803`), add an early branch:

```js
const info = socketToRoom.get(socket.id);
if (!info) return;
if (info.spectator) {
  const room = rooms.get(info.roomCode);
  room?.spectators?.delete(socket.id);
  socketToRoom.delete(socket.id);
  return;
}
// ...existing seated-player disconnect logic...
```

### 3k. `getRoomState(room)` — expose spectator count

Add `spectatorCount: room.spectators?.size ?? 0` to the emitted `RoomState`. Players might want to know they're being watched. Minor; could be skipped.

## 4. Client Changes

### 4a. URL sync — `client/src/App.vue`

Replace the single-shot URL read (lines 19–24) with bidirectional sync:

```js
const myRoomCode = ref(null);
const view = ref('lobby');

// Push URL when entering a room
watch([myRoomCode, view], ([code, v]) => {
  if (v === 'lobby') {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  } else if (code) {
    const target = `/r/${code}`;
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
  }
});

// Back/forward → if URL drifts from in-memory state, reconcile
window.addEventListener('popstate', () => {
  const m = window.location.pathname.match(/^\/r\/(\w+)$/i);
  if (!m) {
    onLeave();  // returned to root via back button
  } else if (m[1].toUpperCase() !== myRoomCode.value) {
    // User navigated to a different room URL via back/forward — leave current, attempt new
    onLeave();
    // Then trigger auto-join to the new code (fall through to existing path).
  }
});
```

### 4b. URL parsing on boot

Accept both `/r/CODE` and `/join/CODE` (legacy):

```js
const codeMatch = window.location.pathname.match(/^\/(?:r|join)\/(\w+)$/i);
if (codeMatch) {
  joinCodeFromUrl.value = codeMatch[1].toUpperCase();
  // Normalise legacy /join/ → /r/
  if (window.location.pathname.startsWith('/join/')) {
    window.history.replaceState({}, '', `/r/${codeMatch[1].toUpperCase()}`);
  }
}
```

### 4c. Auto-join chooses the right path

Current `tryAutoJoin()` (App.vue:46) always emits `join_room`. The server now routes join_room → rejoin/takeover/spectator automatically per §3b, so the client code stays simple. The client just needs to handle three possible responses:

```js
socket.on('takeover_success', ({ seat, roomCode, gameState, roomState }) => {
  mySeat.value = seat;
  myRoomCode.value = roomCode;
  roomState.value = roomState;
  gameState.value = gameState;
  view.value = 'game';
});

socket.on('spectate_joined', ({ roomCode, roomState, gameState }) => {
  mySeat.value = null;
  myRoomCode.value = roomCode;
  roomState.value = roomState;
  gameState.value = gameState;
  view.value = gameState ? 'spectate' : 'waiting_spectate';
});

socket.on('spectator_seat_offer', ({ seat }) => {
  seatOffer.value = seat;   // triggers a banner in the GameBoard — tap to claim
});
```

`view.value = 'spectate'` is new — add a matching `<GameBoard :spectator="true" ... />` prop path (see 4e).

### 4d. `WaitingRoom.vue` share link

The share link at WaitingRoom.vue:14 should emit `/r/{code}` not `/join/{code}`:

```js
const shareUrl = computed(() => `${window.location.origin}/r/${props.roomState.code}`);
```

`/join/{code}` still works because the client normalises it on boot (§4b).

### 4e. `GameBoard.vue` spectator variant

Add a `spectator: Boolean` prop. When true:

- All four hand spots render card-backs regardless of seat.
- Bottom action bar shows "Spectating — waiting for a seat" instead of the personal action buttons.
- When a `spectator_seat_offer` event arrives, show a modal: "Seat {N} is open. Claim it?" → confirm emits `takeover_seat`.

### 4f. `LobbyScreen.vue` — no behavioural change

Existing `initialCode` prop still works for direct-from-URL flows. The existing behaviour (show name entry, prefill code) is unchanged.

## 5. Gotchas

### 5a. Race: bot is mid-action when takeover fires

`runBotTurns` (`server.js:~116–140`) is a while-loop that calls `AIPlayer.decideAction()`, which calls `game.placeBid()` etc., then checks if the next seat is a bot and loops. If the current bot has already started a decision (`await new Promise(r => setTimeout(r, 600))` delay at `aiPlayer.js:184`) when the takeover fires, here's what happens:

1. Takeover flips `seats[i].isBot = false`.
2. Bot's setTimeout resolves. `decideAction` proceeds to call e.g. `game.placeBid(seat, ...)`. Game logic doesn't check `seats[i].isBot`; it checks `activeSeat === seat` and the phase. So the bid goes through.
3. **Result**: the bot gets one "last word" even after takeover. For bidding, this could mean the new human arrives to a state where the bot already placed a bid for them.

Two mitigation options:
- **Option A (simple, recommended)**: let the bot's last action through. The human sees the result in their first `game_state`. Acceptable for bidding (human can still pass-raise in overbid window per Spec 001 if implemented), less ideal for a card play.
- **Option B (correct)**: store an abort flag in `room.bots[seat]` and have `decideAction` check it after the setTimeout. On takeover, set the flag before deleting the bot. This is ~5 lines in `aiPlayer.js:183–186`.

Recommend Option B. Flag in Open Questions.

### 5b. `game.seats[i].isConnected` — existing bug surface

Line 3c pseudocode carefully flips `isConnected` true. Note the existing `rejoin_room` handler at `server.js:764` sets `game.seats[i].isConnected = true`, but the disconnect handler at `server.js:823` sets it to `false`. During bot play, nobody reads `isConnected` — it's purely informational for clients. Keep parity with existing rejoin behaviour.

### 5c. Two-tab scenario

If a user opens `/r/ABCD` in two tabs, both tabs share `surri_playerId` in localStorage. First tab joins as seat 2 (say). Second tab fires `join_room` with the same playerId → server finds the playerId already in a seat → fall-through to spectator mode (correct) OR takeover a DIFFERENT bot seat (also correct, user gets two seats in the same game).

Current code at `server.js:401` naively `set`s `playerToRoom` without checking conflicts. For this spec, the simplest answer: allow it. Two-tab users get two seats. If we want to block this, add a check at the top of `_joinStartedRoom`: "if socket.playerId already maps to a seat in this room, return error or force them to that seat". Flag in Open Questions.

### 5d. Spectator FIFO promotion can race with disconnect

Timeline:
1. Spectator A joins (first in Set).
2. Seat 1 becomes claimable; `spectator_seat_offer` emitted to A.
3. A's socket disconnects before responding.
4. B, who is also spectating, never gets offered.

Mitigation: on disconnect of a spectator (§3j), re-run `_promoteSpectatorIfPossible(room)`. Add a re-entry: the offer has an implicit 15s TTL — if the offered spectator doesn't emit `takeover_seat` within 15s, server re-offers to next. Flag in Open Questions — could skip for v1 and fix if it becomes annoying.

### 5e. Deep-link to a deleted room

User bookmarks `/r/ABCD`. 10 minutes later the room is gone (all-bot cleanup). User reloads. App.vue emits `join_room`, server replies `error: Room not found`. Client should show "This game has ended" and offer a lobby button. The existing error display (`App.vue:93`) already handles this — just confirm the UX wording is clean.

### 5f. `isTempBot` window vs. spectator promotion

During the 5-minute grace, the seat is NOT claimable (by design, per §2b). The URL-visitor becomes a spectator. When the grace expires (server.js:839 timeout), the seat flips `isTempBot = false`. At that moment, `_promoteSpectatorIfPossible` must fire. Add the call inside the grace-expiry timeout body at `server.js:853`:

```js
}, 5 * 60 * 1000);
// Inside the timeout callback, after broadcastGameState:
_promoteSpectatorIfPossible(r);
```

### 5g. Name choice for spectators

Spectator has no assigned name until they claim a seat. The `takeover_seat` payload includes `name`, which they provide on the confirmation modal (or we pull from `localStorage.surri_name`). If neither, default to "Guest N" where N is a counter. Tiny detail but user-facing.

### 5h. Privacy of in-progress hands when a human is replaced by a human

When human A is mid-round and disconnects, 5 minutes pass, grace expires, spectator B is promoted. B now sees A's hand for the rest of the round. That's the cost of delegation-by-timeout — A effectively "gave up" their privacy by not reconnecting. This is consistent with how bots already surface seat info to anyone peeking (they don't, but the state transition is identical). Document it; don't engineer around it.

### 5i. Analytics

Fire `logEvent('takeover_seat', { seat })` and `logEvent('spectate_start')` / `logEvent('spectate_promoted')`. Existing analytics in `App.vue:68–69`, `:79` — follow the pattern.

## 6. Test Cases

### 6a. URL sync — create room

1. Open `/` in browser. Create room ABCD.
2. URL becomes `/r/ABCD`. Refresh browser.
3. With `surri_name` set: app re-enters room as seat 0 (host) via `join_room`. Game state restored if game started.
4. Without `surri_name`: lobby shown with code prefilled.

### 6b. URL sync — deep link join

1. Friend shares `https://.../r/ABCD`. User opens it.
2. With `surri_name` in localStorage: auto `join_room`. Server routes to (a) rejoin if pending, (b) takeover if bot, (c) spectator. User lands in the right view.
3. Without: lobby with code prefilled.

### 6c. Mid-game takeover — simple

1. Host creates room with 3 bots. Starts game.
2. On another device/browser with cleared localStorage: visit `/r/ABCD`, enter name "Alice".
3. Server routes to `_takeoverSeat` — Alice claims seat 1 (lowest-index bot).
4. Alice's client receives `takeover_success`, renders `GameBoard` with seat 1's hand.
5. Round continues. Alice makes the next decision for seat 1 when `activeSeat === 1`.
6. Assert `seats[1].name === 'Alice'`, not `Bot 1`.

### 6d. Grace period is respected

1. Room with 1 human + 3 bots. Game in progress, seat 0 = human "Bob".
2. Bob closes browser. Server disconnects, marks seat 0 `isBot=true, isTempBot=true`.
3. Within 5 min, Alice visits `/r/ABCD`. Server's takeover logic skips seat 0 (tempBot), claims seat 1 (was "Bot 1"). Alice is seat 1.
4. Bob re-opens the page (playerId still in localStorage). Server's rejoin_room restores Bob to seat 0 (grace not expired). Both Bob and Alice are now at the table.
5. Assert: seat 0 isBot=false, name=Bob; seat 1 isBot=false, name=Alice.

### 6e. Grace expires → auto-promote

1. Same as 6d, but Bob doesn't come back.
2. Room currently has: seat 0 (Bob, tempBot), seats 1–3 bots. Alice has NOT joined yet; no spectators.
3. Carol visits `/r/ABCD`. Seat 0 is tempBot (unclaimable), seats 1–3 are claimable bots. Server claims seat 1 for Carol.
4. Grace expires. Seat 0 flips to regular bot. `_promoteSpectatorIfPossible` runs but no spectators queued → no-op. Game continues with 3 bots.

### 6f. Spectator mode — full room of humans

1. 4 humans in a room, game started.
2. Visitor with playerId X visits `/r/ABCD`.
3. Server: no rejoin-pending, no claimable bots, no nulls → `_joinAsSpectator`. Visitor gets `spectate_joined`.
4. Visitor sees all 4 hand-back spots. Header shows "Spectating".
5. Seat 2 closes browser → disconnect → `isBot=true, isTempBot=true`. Spectator doesn't get offered (grace active).
6. 5 minutes pass. Grace expires. Spectator receives `spectator_seat_offer: { seat: 2 }`.
7. Spectator confirms → emits `takeover_seat { name: "David", seat: 2 }`. Server hands seat 2 to spectator.

### 6g. Bot race — takeover while bot is mid-action

1. Room with 3 bots. Bidding phase, seat 1 (bot) is activeSeat. Bot's `decideAction` setTimeout is running (400–1000ms delay).
2. During the delay, Alice visits `/r/ABCD`, takes over seat 1.
3. Option B (recommended): abort flag triggers, bot's post-delay action is skipped. Alice receives game_state with activeSeat=1, no bid placed yet. She decides.
4. Assert: `bidHistory` has no entry from seat 1 during the race window.

### 6h. Two-tab same-player (edge)

1. User opens `/r/ABCD` in Tab 1, takes seat 1.
2. User opens `/r/ABCD` in Tab 2 (same browser, same playerId). Server currently (§5c): claims another bot seat for the second tab. User now has seats 1 and 2.
3. Assert: both tabs receive their own `game_state` for their own seat. Confirm expected behaviour per §9 Open Questions.

### 6i. Room-not-found

1. Visit `/r/ZZZZ` (invalid code).
2. Server emits `error: Room not found`.
3. App shows error, redirects to lobby with error toast.

### 6j. URL navigation — back button

1. In a room `/r/ABCD`. Click back.
2. `popstate` fires, detects URL is `/`, calls `onLeave()`. Client disconnects from room (emit `leave_room` or just blanks state).
3. Forward button: re-enters `/r/ABCD`, re-triggers auto-join.

### 6k. Spectator blocks 10s cleanup

1. Room with 1 human + 3 bots. Human disconnects. Grace 5 min.
2. During grace, a spectator visits. `room.spectators.size === 1`.
3. 5 min later grace expires → all 4 seats are bots, spectator is waiting.
4. `allBots && !hasPendingReconnect && !hasSpectators` → false (hasSpectators=true). **Room is NOT dropped.**
5. Spectator confirms takeover of seat 1. Room has 1 human + 3 bots again. Room stable.

### 6l. Capacitor native build — no URL regression

1. `npm run build:apk`, install on Android.
2. App launches at `/`, creates a room, plays a game. URL manipulation via pushState is harmless in WebView (no address bar visible).
3. Confirm no crashes, no broken deep-link handling (native app isn't opened via URL today — moot, but worth documenting).

## 7. Documentation Changes — `docs/SocketAPI.md`

Add events:
- `takeover_seat` (client → server): `{ name: string, seat: number }`
- `takeover_success` (server → client): `{ seat, roomCode, gameState, roomState }`
- `spectate_joined` (server → client): `{ roomCode, roomState, gameState | null }`
- `spectator_seat_offer` (server → client): `{ seat: number }`
- `leave_spectator` (client → server): `{}` — optional, mirror of `leave`

Clarify in the `join_room` docs that the handler now routes to three paths (rejoin / takeover / spectate) when `gameStarted === true`.

Add a "URL conventions" section: `/r/{CODE}` is the canonical room URL; `/join/{CODE}` is a supported legacy alias.

## 8. Verification

1. **Happy path — takeover**: local `npm run dev`. Create room from browser tab 1 with 3 bots, start game, advance to bidding phase. In tab 2 (incognito, different localStorage), visit `http://localhost:5173/r/ABCD` (substitute code). Enter a name. Confirm tab 2 lands directly in the game board at a bot seat, can interact.
2. **Grace period**: same setup; after game start, close tab 1 entirely. Within 2 min, open tab 3 (different playerId); confirm tab 3 enters as spectator (seat 0 is tempBot, other seats don't exist as bots — wait, 3-bot room means seats 1–3 are bots so tab 3 CAN claim one). Better scenario: 4-human room, one disconnects, another joins → spectator until grace expires.
3. **URL sync**: throughout, watch the browser address bar — `/r/CODE` should be stable, survive refreshes, respond to back/forward.
4. **Automated**: new `server/test-takeover.js` exercising `SurriGame` + seat-state transitions directly. Seed a 4-bot game, walk through: disconnect human → takeover → rejoin original → takeover again, verifying state mutations at each step.
5. **FAST_TEST regression**: `FAST_TEST=1 node server/test-game.js` — unchanged, must still complete. Takeover code paths aren't exercised but the relaxed `join_room` must not break the existing harness.
6. **Lighthouse / network trace**: confirm `spectate_joined` game_state has `myHand: []` (no hand leakage to spectators).

## 9. Open Questions

### Resolved

1. **Bot race mitigation** (§5a): **Option B (abort flag in aiPlayer.js)** — the reviewer flagged safety as the priority. Spend the ~5 extra lines to prevent bot actions after takeover.
3. **Two-tab same-playerId** (§5c, §6h): **Allow.** Reviewer: "we can live with it, ignore." Two-tab users can end up in two seats of the same game; document but don't block.
5. **Name overwrite on takeover** (§3c): **Immediate overwrite.** `seats[seat].name = 'Alice'`. No interim "Bot 1 → Alice" label.
6. **Spectator persistence across refresh**: **Intuitive approach — works by default.** Refresh routes back through `join_room` → spectator. No code change; just mention in docs.

### Still open — needs another review pass

2. **Spectator offer TTL** (§5d): no annotation. Proceed with no-TTL v1.
4. **Manual seat selection** (§2b): no annotation. Proceed with auto-pick for v1; manual selection is a v2 enhancement.
7. **Rate-limiting**: no annotation. Keep the current 4-char codes; threat model is unchanged from today's `/join/` link.

### Follow-up from review — multi-device / multi-tab flow

Reviewer flagged the auto-pick takeover policy and the URL-sync behaviour across multiple devices / tabs as needing clarification. Before implementing §2b and §4a, sketch the state machine explicitly for these scenarios:

- Same user, same playerId, two browser tabs on the same device → two distinct seats (confirmed per §3 above, but describe the UX — is there a visual cue that "you are also at seat X in this room"?).
- Same user, different device, while first device is still connected → rejoin takes priority over takeover (already covered in §3b Priority 1).
- Same user, different device, first device disconnected but in grace period → second device becomes a spectator until grace expires, then is offered the original seat (already covered in §5f).

Spelling out each sequence in a short table before coding will catch cases the current prose elides.

## 10. Critical Files

| Path | Change | Summary |
|---|---|---|
| `server/server.js` | modify | `join_room` relaxation; new `_joinStartedRoom`, `_takeoverSeat`, `_joinAsSpectator`, `_spectatorGameState`, `_promoteSpectatorIfPossible`; extend `broadcastGameState`; `disconnect` spectator branch; 10s cleanup guard |
| `server/aiPlayer.js` | modify (if Option B) | Abort flag check in `decideAction` after setTimeout |
| `client/src/App.vue` | modify | URL push/pop sync, new socket event handlers for `takeover_success` / `spectate_joined` / `spectator_seat_offer`, `popstate` listener |
| `client/src/components/WaitingRoom.vue` | modify | Share link → `/r/{CODE}` |
| `client/src/components/GameBoard.vue` | modify | `spectator` prop; seat-offer confirmation modal |
| `client/src/components/LobbyScreen.vue` | no change | Existing `initialCode` path still works |
| `docs/SocketAPI.md` | modify | New events + URL conventions section |
| `docs/GameFlow.md` | minor | Mention takeover + spectator in §1 Session Setup |
| `docs/Board.md` | modify | Spectator view description |
| `server/test-takeover.js` | new | Scenarios 6a–6k, harness-driven |

**No changes** to: `gameLogic.js` (pure game rules unaffected), `nginx/surri2.conf` (SPA fallback already serves `/r/*` to `index.html`), Capacitor config, Firebase integration, deployment pipeline.
