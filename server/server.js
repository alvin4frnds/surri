'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { SurriGame } = require('./gameLogic');
const { AIPlayer } = require('./aiPlayer');
const { createIssue } = require('./githubIssue');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

// code -> {
//   code, seats:[{name,isBot,socketId,isConnected}], game, bots:{seat->AIPlayer},
//   hostSeat, gameStarted
// }
const rooms = new Map();

// socketId -> { roomCode, seat }
const socketToRoom = new Map();

// playerId -> { roomCode, seat } — tracks active player sessions
const playerToRoom = new Map();

// playerId -> { roomCode, seat, playerName, timeout, disconnectedAt }
const pendingReconnects = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode() {
  const size = rooms.size;
  if (size < 100) return String(Math.floor(Math.random() * 900) + 100);
  if (size < 9000) return String(Math.floor(Math.random() * 9000) + 1000);
  if (size < 90000) return String(Math.floor(Math.random() * 90000) + 10000);
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getRoomState(room) {
  return {
    code: room.code,
    seats: room.seats.map(s => ({
      name: s ? s.name : null,
      isBot: s ? s.isBot : false,
      isConnected: s ? s.isConnected : false,
      isTempBot: s ? (s.isTempBot || false) : false,
    })),
    hostSeat: room.hostSeat,
    gameStarted: room.gameStarted,
  };
}

function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const state = getRoomState(room);
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (s && !s.isBot && s.socketId && s.isConnected) {
      io.to(s.socketId).emit('room_updated', { state });
    }
  }
}

function _spectatorGameState(game) {
  // Spectator view: start from seat 0's state and null out the personal bits.
  // partnerHand stays as-is — it's already phase-gated in getStateFor and is
  // public info once the overbid window closes and bid >= 10.
  const base = game.getStateFor(0);
  return {
    ...base,
    myHand: [],
    myTurn: false,
    playableCards: [],
    mySeat: null,
    spectator: true,
  };
}

function broadcastGameState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (s && !s.isBot && s.socketId && s.isConnected) {
      io.to(s.socketId).emit('game_state', { state: room.game.getStateFor(seat) });
    }
  }
  if (room.spectators && room.spectators.size > 0) {
    const spectatorState = _spectatorGameState(room.game);
    for (const socketId of room.spectators) {
      io.to(socketId).emit('game_state', { state: spectatorState });
    }
  }
}

function _promoteSpectatorIfPossible(room) {
  if (!room.spectators || room.spectators.size === 0) return;
  const claimable = room.seats.findIndex(s => s && s.isBot === true && s.isTempBot !== true);
  if (claimable === -1) return;

  // FIFO — Set preserves insertion order.
  const [socketId] = room.spectators;
  const sock = io.sockets.sockets.get(socketId);
  if (!sock) {
    // Spectator disconnected without hitting our disconnect handler — drop and retry.
    room.spectators.delete(socketId);
    _promoteSpectatorIfPossible(room);
    return;
  }
  sock.emit('spectator_seat_offer', { seat: claimable });
}

function createBotForSeat(seat, room) {
  const bot = new AIPlayer(seat, room.game);
  room.bots[seat] = bot;
}

async function runBotTurns(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;
  const game = room.game;

  // Prevent concurrent runBotTurns calls
  if (room._botRunning) return;
  room._botRunning = true;

  try {
    while (true) {
      if (game.isGameOver() !== null) break;

      if (game.phase === 'scoring') {
        // Wait for human to click next_round (30s safety timeout)
        const maxWait = process.env.FAST_TEST ? 50 : 30000;
        await new Promise(r => {
          room._scoringResolve = r;
          setTimeout(() => { room._scoringResolve = null; r(); }, maxWait);
        });
        game.round++;
        game.startRound();
        broadcastGameState(roomCode);
        continue;
      }

      if (game.activeSeat === null) break;

      const activeSeat = game.activeSeat;
      const activeSeatInfo = room.seats[activeSeat];

      // Check if it's a pending support request for a bot
      if (game.pendingSupportRequest) {
        const partnerSeat = (game.pendingSupportRequest.asker + 2) % 4;
        if (partnerSeat === activeSeat && room.seats[partnerSeat]?.isBot) {
          const bot = room.bots[partnerSeat];
          if (bot) {
            await bot.decideAction();
            broadcastGameState(roomCode);
            continue;
          }
        }
        // Human partner needs to respond — stop bot loop
        if (!room.seats[partnerSeat]?.isBot) break;
      }

      if (!activeSeatInfo?.isBot) break;

      const bot = room.bots[activeSeat];
      if (!bot) break;

      const prevPhase = game.phase;
      const prevActive = game.activeSeat;
      const prevTrickLen = game.currentTrick.length;

      const action = await bot.decideAction();
      broadcastGameState(roomCode);

      // Safety: if bot didn't change any game state, break to avoid infinite loop
      if (!action && game.phase === prevPhase && game.activeSeat === prevActive && game.currentTrick.length === prevTrickLen) {
        console.error(`Bot ${activeSeat} stuck: phase=${game.phase}, active=${game.activeSeat}, trick=${game.currentTrick.length}`);
        break;
      }

      // If trick just completed (4 cards), pause so clients see all cards, then resolve
      if (game.currentTrick.length === 4 && game.activeSeat === null) {
        const trickDelay = process.env.FAST_TEST ? 50 : 1200;
        await new Promise(r => setTimeout(r, trickDelay));
        game.resolveTrick();
        broadcastGameState(roomCode);
      }
    }
  } finally {
    room._botRunning = false;
  }
}

// ---------------------------------------------------------------------------
// REST / Dashboard
// ---------------------------------------------------------------------------

app.use(express.json());

app.get('/api/stats', (req, res) => {
  const activeRooms = [];
  let totalPlayers = 0;
  let totalBots = 0;

  for (const [code, room] of rooms) {
    const players = room.seats.filter(s => s && !s.isBot);
    const bots = room.seats.filter(s => s && s.isBot);
    const connectedPlayers = players.filter(s => s.isConnected);
    totalPlayers += connectedPlayers.length;
    totalBots += bots.length;
    activeRooms.push({
      code,
      gameStarted: room.gameStarted,
      phase: room.game?.phase || null,
      round: room.game?.round ?? null,
      trick: room.game ? room.game.tricksWon[0] + room.game.tricksWon[1] + 1 : null,
      players: players.map(s => ({ name: s.name, connected: s.isConnected })),
      botCount: bots.length,
    });
  }

  res.json({
    timestamp: new Date().toISOString(),
    totalRooms: rooms.size,
    totalPlayers,
    totalBots,
    connectedSockets: io.engine?.clientsCount ?? socketToRoom.size,
    rooms: activeRooms,
  });
});

app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surri - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1b2d; color: #e2e8f0; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; color: #93c5fd; }
    .subtitle { color: #64748b; font-size: 0.85rem; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #60a5fa; }
    .stat-label { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .rooms-section h2 { font-size: 1.1rem; color: #93c5fd; margin-bottom: 12px; }
    .room-card { background: #1e293b; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .room-code { font-weight: 700; font-size: 1.1rem; color: #f59e0b; font-family: monospace; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
    .badge-waiting { background: #1e3a5f; color: #60a5fa; }
    .badge-playing { background: #064e3b; color: #34d399; }
    .room-details { font-size: 0.8rem; color: #94a3b8; }
    .room-details span { margin-right: 16px; }
    .player-list { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
    .player-tag { background: #334155; padding: 2px 10px; border-radius: 6px; font-size: 0.75rem; }
    .player-tag.disconnected { opacity: 0.5; text-decoration: line-through; }
    .empty-state { color: #475569; text-align: center; padding: 40px; }
    .refresh-info { color: #475569; font-size: 0.75rem; text-align: center; margin-top: 24px; }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <h1>Surri Dashboard</h1>
  <p class="subtitle">Real-time server stats <span id="status" class="pulse">&#9679;</span></p>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" id="totalRooms">-</div><div class="stat-label">Active Rooms</div></div>
    <div class="stat-card"><div class="stat-value" id="totalPlayers">-</div><div class="stat-label">Human Players</div></div>
    <div class="stat-card"><div class="stat-value" id="totalBots">-</div><div class="stat-label">Bots</div></div>
    <div class="stat-card"><div class="stat-value" id="connectedSockets">-</div><div class="stat-label">Connections</div></div>
  </div>

  <div class="rooms-section">
    <h2>Active Rooms</h2>
    <div id="roomsList"><div class="empty-state">Loading...</div></div>
  </div>

  <div class="refresh-info">Auto-refreshes every 5 seconds</div>

  <script>
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('totalRooms').textContent = data.totalRooms;
        document.getElementById('totalPlayers').textContent = data.totalPlayers;
        document.getElementById('totalBots').textContent = data.totalBots;
        document.getElementById('connectedSockets').textContent = data.connectedSockets;
        document.getElementById('status').style.color = '#34d399';

        const container = document.getElementById('roomsList');
        if (data.rooms.length === 0) {
          container.innerHTML = '<div class="empty-state">No active rooms</div>';
          return;
        }

        container.innerHTML = data.rooms.map(room => {
          const phase = room.gameStarted
            ? (room.phase || 'playing')
            : 'waiting';
          const badgeClass = room.gameStarted ? 'badge-playing' : 'badge-waiting';
          const details = room.gameStarted
            ? '<span>Round ' + (room.round ?? '?') + '</span><span>Phase: ' + phase + '</span>'
            : '<span>Waiting for players</span>';
          const players = room.players.map(p =>
            '<span class="player-tag ' + (p.connected ? '' : 'disconnected') + '">' + p.name + '</span>'
          ).join('');

          return '<div class="room-card">'
            + '<div class="room-header">'
            + '<span class="room-code">' + room.code + '</span>'
            + '<span class="badge ' + badgeClass + '">' + (room.gameStarted ? 'In Game' : 'Lobby') + '</span>'
            + '</div>'
            + '<div class="room-details">' + details + '<span>Bots: ' + room.botCount + '</span></div>'
            + '<div class="player-list">' + players + '</div>'
            + '</div>';
        }).join('');
      } catch (e) {
        document.getElementById('status').style.color = '#ef4444';
      }
    }

    fetchStats();
    setInterval(fetchStats, 5000);
  </script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Socket events
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  const playerId = socket.handshake.auth?.playerId || null;
  socket.playerId = playerId;
  console.log(`Socket connected: ${socket.id} (playerId: ${playerId})`);

  // -------------------------------------------------------------------------
  // create_room
  // -------------------------------------------------------------------------
  socket.on('create_room', ({ name, botCount }) => {
    try {
      botCount = Math.max(0, Math.min(3, botCount ?? 3));

      let code;
      do { code = generateCode(); } while (rooms.has(code));

      const seats = [];

      // Host takes seat 0
      seats[0] = { name, isBot: false, socketId: socket.id, isConnected: true, playerId };

      // Fill remaining seats with bots (seats 1..botCount)
      for (let i = 1; i <= botCount; i++) {
        seats[i] = { name: `Bot ${i}`, isBot: true, socketId: null, isConnected: true };
      }

      // Fill any remaining empty seats as null (waiting for humans)
      for (let i = botCount + 1; i < 4; i++) {
        seats[i] = null;
      }

      const room = {
        code,
        seats,
        game: null,
        bots: {},
        hostSeat: 0,
        gameStarted: false,
        _botRunning: false,
        spectators: new Set(), // socketIds — non-seated viewers
      };

      rooms.set(code, room);
      socketToRoom.set(socket.id, { roomCode: code, seat: 0 });
      if (playerId) playerToRoom.set(playerId, { roomCode: code, seat: 0 });
      socket.join(code);

      const state = getRoomState(room);
      socket.emit('room_created', { code, seat: 0, state });
    } catch (err) {
      console.error('create_room error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // join_room
  //
  // Game not started → fill an open seat (legacy behaviour).
  // Game started    → try takeover of a claimable bot seat, else spectator.
  // -------------------------------------------------------------------------
  socket.on('join_room', ({ name, code }) => {
    try {
      code = code?.toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (room.gameStarted) {
        return _joinStartedRoom(socket, room, name);
      }

      // Find next open human seat
      let seat = -1;
      for (let i = 0; i < 4; i++) {
        if (!room.seats[i] || (room.seats[i].isBot === false && !room.seats[i].socketId)) {
          seat = i;
          break;
        }
      }

      // If no empty slot, try replacing a null slot
      if (seat === -1) {
        for (let i = 0; i < 4; i++) {
          if (!room.seats[i]) {
            seat = i;
            break;
          }
        }
      }

      if (seat === -1) {
        return socket.emit('error', { message: 'Room is full' });
      }

      room.seats[seat] = { name, isBot: false, socketId: socket.id, isConnected: true, playerId };
      socketToRoom.set(socket.id, { roomCode: code, seat });
      if (playerId) playerToRoom.set(playerId, { roomCode: code, seat });
      socket.join(code);

      const state = getRoomState(room);
      socket.emit('room_joined', { seat, state });
      broadcastRoomState(code);
    } catch (err) {
      console.error('join_room error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // Helpers for started-room join (takeover / spectator)
  // -------------------------------------------------------------------------
  function _joinStartedRoom(sock, room, name) {
    const pid = sock.playerId;

    // Priority 1: pending reconnect for this playerId — if they called
    // join_room instead of rejoin_room, be forgiving and route them through.
    if (pid && pendingReconnects.has(pid)) {
      const pending = pendingReconnects.get(pid);
      if (pending.roomCode === room.code) {
        // Trigger the existing rejoin flow. Emit the rejoin event back and
        // let the client handle it the standard way.
        sock.emit('rejoin_available');
        return;
      }
    }

    // Priority 2: takeover a claimable bot seat.
    const claimable = room.seats.findIndex(s => s && s.isBot === true && s.isTempBot !== true);
    if (claimable !== -1) {
      return _takeoverSeat(sock, room, claimable, name);
    }

    // Priority 3: spectator.
    return _joinAsSpectator(sock, room);
  }

  function _takeoverSeat(sock, room, seat, name) {
    const seatInfo = room.seats[seat];
    const pid = sock.playerId;

    // Abort any in-flight bot decision for this seat so the human isn't
    // surprised by a last-millisecond bot move after takeover.
    if (room.bots[seat]) {
      room.bots[seat]._aborted = true;
    }

    seatInfo.isBot = false;
    seatInfo.isTempBot = false;
    seatInfo.socketId = sock.id;
    seatInfo.isConnected = true;
    seatInfo.playerId = pid;
    seatInfo.name = name;

    if (room.game && room.game.seats[seat]) {
      room.game.seats[seat].isBot = false;
      room.game.seats[seat].isConnected = true;
      room.game.seats[seat].isTempBot = false;
      room.game.seats[seat].name = name;
    }

    delete room.bots[seat];

    socketToRoom.set(sock.id, { roomCode: room.code, seat });
    if (pid) playerToRoom.set(pid, { roomCode: room.code, seat });
    sock.join(room.code);

    console.log(`Takeover: ${name} claimed seat ${seat} in room ${room.code}`);

    const roomState = getRoomState(room);
    sock.emit('takeover_success', {
      seat,
      roomCode: room.code,
      gameState: room.game.getStateFor(seat),
      roomState,
    });

    broadcastGameState(room.code);
    broadcastRoomState(room.code);
  }

  function _joinAsSpectator(sock, room) {
    if (!room.spectators) room.spectators = new Set();
    room.spectators.add(sock.id);
    socketToRoom.set(sock.id, { roomCode: room.code, seat: null, spectator: true });
    sock.join(room.code);

    sock.emit('spectate_joined', {
      roomCode: room.code,
      roomState: getRoomState(room),
      gameState: room.game ? _spectatorGameState(room.game) : null,
    });
  }

  // -------------------------------------------------------------------------
  // start_game
  // -------------------------------------------------------------------------
  socket.on('start_game', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (info.seat !== room.hostSeat) return socket.emit('error', { message: 'Only host can start' });
      if (room.gameStarted) return socket.emit('error', { message: 'Game already started' });

      // Fill any remaining empty seats with bots
      for (let i = 0; i < 4; i++) {
        if (!room.seats[i]) {
          room.seats[i] = { name: `Bot ${i}`, isBot: true, socketId: null, isConnected: true };
        }
      }

      // Create game
      room.gameStarted = true;
      const gameSeats = room.seats.map(s => ({ name: s.name, isBot: s.isBot, isConnected: s.isConnected }));
      room.game = new SurriGame(gameSeats);

      // Create bots
      for (let i = 0; i < 4; i++) {
        if (room.seats[i]?.isBot) {
          createBotForSeat(i, room);
        }
      }

      // Pick first dealer randomly
      const firstDealer = Math.floor(Math.random() * 4);
      room.game.startRound(firstDealer);

      broadcastGameState(info.roomCode);
      runBotTurns(info.roomCode);
    } catch (err) {
      console.error('start_game error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // ask_support
  // -------------------------------------------------------------------------
  socket.on('ask_support', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.askSupport(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('ask_support error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // give_support
  // -------------------------------------------------------------------------
  socket.on('give_support', async ({ signal }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.giveSupport(info.seat, signal);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('give_support error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // place_bid
  // -------------------------------------------------------------------------
  socket.on('place_bid', async ({ bid, trump }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.placeBid(info.seat, bid, trump);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('place_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // pass_bid
  // -------------------------------------------------------------------------
  socket.on('pass_bid', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.passBid(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('pass_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // increase_bid
  // -------------------------------------------------------------------------
  socket.on('increase_bid', async ({ bid }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.increaseBid(info.seat, bid);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('increase_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // raise_bid — overbid during the bidding_raise window
  // -------------------------------------------------------------------------
  socket.on('raise_bid', async ({ bid, trump }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.raiseBid(info.seat, bid, trump);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('raise_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // pass_raise — pass during the bidding_raise window
  // -------------------------------------------------------------------------
  socket.on('pass_raise', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.passRaise(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('pass_raise error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // start_play
  // -------------------------------------------------------------------------
  socket.on('start_play', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.startPlay(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('start_play error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // play_card
  // -------------------------------------------------------------------------
  socket.on('play_card', async ({ card }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.playCard(info.seat, card);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);

      // If trick just completed, pause so clients see all 4 cards, then resolve
      if (result.trickComplete) {
        const trickDelay = process.env.FAST_TEST ? 50 : 1200;
        await new Promise(r => setTimeout(r, trickDelay));
        room.game.resolveTrick();
        broadcastGameState(info.roomCode);
      }

      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('play_card error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // declare_dhaap
  // -------------------------------------------------------------------------
  socket.on('declare_dhaap', () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.declareDhaap(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
    } catch (err) {
      console.error('declare_dhaap error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // call_tram
  // -------------------------------------------------------------------------
  socket.on('call_tram', async ({ cards, partnerCards }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.callTram(info.seat, cards, partnerCards || null);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('call_tram error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // give_up — concede remaining tricks to opponent
  // -------------------------------------------------------------------------
  socket.on('give_up', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.giveUp(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('give_up error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // next_round — skip scoring delay
  // -------------------------------------------------------------------------
  socket.on('next_round', () => {
    const info = socketToRoom.get(socket.id);
    if (!info) return;
    const room = rooms.get(info.roomCode);
    if (room && room._scoringResolve) {
      room._scoringResolve();
      room._scoringResolve = null;
    }
  });

  // -------------------------------------------------------------------------
  // report_issue
  // -------------------------------------------------------------------------
  socket.on('report_issue', async ({ description, screenshot }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const gameState = room.game.getStateFor(info.seat);
      const result = await createIssue({
        description,
        screenshot,
        gameState,
        mySeat: info.seat,
        roomCode: info.roomCode,
      });

      if (result.ok) {
        socket.emit('issue_reported', { issueNumber: result.issueNumber, url: result.url });
      } else {
        socket.emit('error', { message: result.error || 'Failed to create issue' });
      }
    } catch (err) {
      console.error('report_issue error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // takeover_seat — spectator confirming a seat offer, or explicit claim
  // -------------------------------------------------------------------------
  socket.on('takeover_seat', ({ name, seat }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info || !info.spectator) {
        return socket.emit('error', { message: 'Not a spectator' });
      }
      const room = rooms.get(info.roomCode);
      if (!room) return socket.emit('error', { message: 'Room not found' });

      const target = room.seats[seat];
      if (!target || !target.isBot || target.isTempBot) {
        return socket.emit('error', { message: 'Seat not claimable' });
      }

      room.spectators?.delete(socket.id);
      _takeoverSeat(socket, room, seat, name || 'Guest');
    } catch (err) {
      console.error('takeover_seat error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // leave_spectator — spectator wants to return to lobby
  // -------------------------------------------------------------------------
  socket.on('leave_spectator', () => {
    const info = socketToRoom.get(socket.id);
    if (!info || !info.spectator) return;
    const room = rooms.get(info.roomCode);
    if (room) room.spectators?.delete(socket.id);
    socketToRoom.delete(socket.id);
    socket.leave(info.roomCode);
  });

  // -------------------------------------------------------------------------
  // rejoin_room — reconnect after temporary disconnect
  // -------------------------------------------------------------------------
  socket.on('rejoin_room', () => {
    const pid = socket.playerId;
    if (!pid) {
      socket.emit('rejoin_failed', { reason: 'no_player_id' });
      return;
    }

    const pending = pendingReconnects.get(pid);
    if (!pending) {
      socket.emit('rejoin_failed', { reason: 'no_pending_session' });
      return;
    }

    const room = rooms.get(pending.roomCode);
    if (!room) {
      clearTimeout(pending.timeout);
      pendingReconnects.delete(pid);
      playerToRoom.delete(pid);
      socket.emit('rejoin_failed', { reason: 'room_deleted' });
      return;
    }

    const seatInfo = room.seats[pending.seat];
    if (!seatInfo) {
      clearTimeout(pending.timeout);
      pendingReconnects.delete(pid);
      playerToRoom.delete(pid);
      socket.emit('rejoin_failed', { reason: 'seat_gone' });
      return;
    }

    // Clear the grace period timeout
    clearTimeout(pending.timeout);
    pendingReconnects.delete(pid);

    // Restore seat to human
    seatInfo.isBot = false;
    seatInfo.isTempBot = false;
    seatInfo.socketId = socket.id;
    seatInfo.isConnected = true;
    seatInfo.playerId = pid;

    if (room.game && room.game.seats[pending.seat]) {
      room.game.seats[pending.seat].isBot = false;
      room.game.seats[pending.seat].isConnected = true;
      room.game.seats[pending.seat].isTempBot = false;
    }

    // Remove bot
    delete room.bots[pending.seat];

    // Update maps
    socketToRoom.set(socket.id, { roomCode: pending.roomCode, seat: pending.seat });
    playerToRoom.set(pid, { roomCode: pending.roomCode, seat: pending.seat });
    socket.join(pending.roomCode);

    console.log(`Player ${pending.playerName} rejoined room ${pending.roomCode} seat ${pending.seat}`);

    // Send current state to reconnected player
    const roomState = getRoomState(room);
    if (room.game) {
      socket.emit('rejoin_success', {
        seat: pending.seat,
        roomCode: pending.roomCode,
        gameState: room.game.getStateFor(pending.seat),
        roomState,
      });
    } else {
      socket.emit('rejoin_success', {
        seat: pending.seat,
        roomCode: pending.roomCode,
        roomState,
      });
    }

    // Broadcast updated state to all (seat no longer temp-bot)
    broadcastGameState(pending.roomCode);
    broadcastRoomState(pending.roomCode);
  });

  // -------------------------------------------------------------------------
  // disconnect
  // -------------------------------------------------------------------------
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const info = socketToRoom.get(socket.id);
    if (!info) return;

    socketToRoom.delete(socket.id);

    const room = rooms.get(info.roomCode);
    if (!room) return;

    // Spectator disconnect — drop from set and re-run promotion (in case
    // a seat opened while this spectator was the head of the queue).
    if (info.spectator) {
      room.spectators?.delete(socket.id);
      _promoteSpectatorIfPossible(room);
      return;
    }

    const seatInfo = room.seats[info.seat];
    if (seatInfo && !seatInfo.isBot) {
      seatInfo.isConnected = false;
      seatInfo.socketId = null;

      if (room.game) {
        // Bot takes over the seat immediately
        seatInfo.isBot = true;
        if (room.game.seats[info.seat]) {
          room.game.seats[info.seat].isBot = true;
          room.game.seats[info.seat].isConnected = false;
        }
        createBotForSeat(info.seat, room);

        const pid = socket.playerId;
        if (pid) {
          // Grace period: mark as temp bot, allow reconnection within 5 minutes
          seatInfo.isTempBot = true;
          if (room.game.seats[info.seat]) {
            room.game.seats[info.seat].isTempBot = true;
          }

          // Clear any existing pending reconnect for this player
          const existing = pendingReconnects.get(pid);
          if (existing) clearTimeout(existing.timeout);

          const timeout = setTimeout(() => {
            // Grace period expired — seat becomes permanent bot
            pendingReconnects.delete(pid);
            playerToRoom.delete(pid);
            const r = rooms.get(info.roomCode);
            if (r && r.seats[info.seat]) {
              r.seats[info.seat].isTempBot = false;
              if (r.game && r.game.seats[info.seat]) {
                r.game.seats[info.seat].isTempBot = false;
              }
              broadcastGameState(info.roomCode);
              broadcastRoomState(info.roomCode);
              // Seat is now a plain bot — a waiting spectator can claim it.
              _promoteSpectatorIfPossible(r);
            }
            console.log(`Grace period expired for player in room ${info.roomCode} seat ${info.seat}`);
          }, 5 * 60 * 1000);

          pendingReconnects.set(pid, {
            roomCode: info.roomCode,
            seat: info.seat,
            playerName: seatInfo.name,
            timeout,
            disconnectedAt: Date.now(),
          });

          console.log(`Player ${seatInfo.name} disconnected from room ${info.roomCode} seat ${info.seat} — 5min grace period`);
        } else {
          seatInfo.isTempBot = false;
        }

        broadcastGameState(info.roomCode);

        // If all 4 players are now bots, drop the game after 10 seconds
        // BUT only if no one has a pending reconnect AND no spectators
        // are watching (spectators can claim the bot seats).
        const allBots = room.seats.every(s => s?.isBot);
        const hasPendingReconnect = room.seats.some(s => s?.isTempBot);
        const hasSpectators = (room.spectators?.size ?? 0) > 0;
        if (allBots && !hasPendingReconnect && !hasSpectators) {
          console.log(`Room ${info.roomCode}: all players are bots, dropping in 10s`);
          setTimeout(() => {
            const r = rooms.get(info.roomCode);
            if (r && r.seats.every(s => s?.isBot) && !r.seats.some(s => s?.isTempBot) && (r.spectators?.size ?? 0) === 0) {
              console.log(`Room ${info.roomCode}: dropped (all bots)`);
              rooms.delete(info.roomCode);
              // Clean up pending reconnects for this room
              for (const [pid, pr] of pendingReconnects) {
                if (pr.roomCode === info.roomCode) {
                  clearTimeout(pr.timeout);
                  pendingReconnects.delete(pid);
                  playerToRoom.delete(pid);
                }
              }
            }
          }, 10000);
        } else {
          await runBotTurns(info.roomCode);
        }
      } else {
        broadcastRoomState(info.roomCode);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Surri2 server running on port ${PORT}`);
});
