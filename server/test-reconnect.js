'use strict';

// Headless test: connect as human + 3 bots, play 2 rounds, disconnect mid-round 3,
// reconnect with same playerId, verify rejoin, continue playing 2 more rounds.
const { io } = require('socket.io-client');
const crypto = require('crypto');

const SERVER = 'http://localhost:3000';
const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const PLAYER_ID = crypto.randomUUID();

let socket;
let roundsPlayed = 0;
let mySeat = null;
let myRoomCode = null;
let disconnectAfterRound = 2;   // disconnect after round 2
let didDisconnect = false;
let didReconnect = false;
let targetRounds = 4;           // play 4 total rounds (2 before + 2 after reconnect)

function log(msg) {
  console.log(`[R${roundsPlayed}] ${msg}`);
}

function cardRankIndex(card) {
  const rank = card.slice(0, -1);
  return RANK_ORDER.indexOf(rank);
}

function pickCard(playableCards) {
  if (playableCards.length === 1) return playableCards[0];
  const sorted = [...playableCards].sort((a, b) => cardRankIndex(a) - cardRankIndex(b));
  return sorted[sorted.length - 1]; // play highest
}

function connect(isReconnect) {
  socket = io(SERVER, {
    auth: { playerId: PLAYER_ID },
    forceNew: true,
  });

  if (isReconnect) {
    socket.on('connect', () => {
      log('Reconnected. Emitting rejoin_room...');
      socket.emit('rejoin_room');
    });

    socket.on('rejoin_success', ({ seat, roomCode, gameState: gs }) => {
      didReconnect = true;
      mySeat = seat;
      myRoomCode = roomCode;
      log(`Rejoin SUCCESS! Seat ${seat}, room ${roomCode}, phase: ${gs?.phase || 'n/a'}`);

      // If we got game state, handle it
      if (gs) {
        handleGameState(gs);
      }
    });

    socket.on('rejoin_failed', ({ reason }) => {
      console.error(`REJOIN FAILED: ${reason}`);
      process.exit(1);
    });
  } else {
    socket.on('connect', () => {
      log('Connected. Creating room with 3 bots...');
      socket.emit('create_room', { name: 'TestPlayer', botCount: 3 });
    });

    socket.on('room_created', ({ code, seat }) => {
      myRoomCode = code;
      mySeat = seat;
      log(`Room ${code} created, seat ${seat}. Starting game...`);
      socket.emit('start_game', {});
    });
  }

  socket.on('error', ({ message }) => {
    console.error(`ERROR: ${message}`);
  });

  socket.on('game_state', ({ state }) => {
    handleGameState(state);
  });

  socket.on('disconnect', () => {
    if (!didDisconnect) {
      log('Unexpected disconnect');
    }
  });
}

function handleGameState(state) {
  const { phase, myTurn, playableCards, lastRoundResult,
          bid, biddingSeat, activeSeat, dealer,
          supportAsked, supportSignals } = state;

  const myTeam = mySeat % 2;
  const dealerTeam = dealer % 2;
  const dealerIsMyTeam = dealerTeam === myTeam;

  // Game over
  if (lastRoundResult?.gameOver) {
    console.log(`\n=== GAME OVER ===`);
    console.log(`Rounds played: ${roundsPlayed}`);
    console.log(`Did disconnect & reconnect: ${didDisconnect && didReconnect}`);

    if (!didDisconnect || !didReconnect) {
      console.error('FAIL: Did not test reconnection flow!');
      socket.disconnect();
      process.exit(1);
    }

    if (roundsPlayed >= targetRounds) {
      console.log(`\nSUCCESS: Played ${roundsPlayed} rounds with disconnect/reconnect in the middle!`);
    } else {
      console.log(`\nSUCCESS: Game ended after ${roundsPlayed} rounds (game over before target, but reconnect worked)`);
    }
    socket.disconnect();
    process.exit(0);
  }

  // Scoring phase — track rounds and check for disconnect trigger
  if (phase === 'scoring' && lastRoundResult) {
    roundsPlayed++;
    const madeStr = lastRoundResult.made ? 'MADE' : 'FAILED';
    log(`Round end: bid ${lastRoundResult.bid}${lastRoundResult.trump} — ${madeStr}. Score: ${lastRoundResult.newScore}`);

    // After target rounds reached, check success
    if (roundsPlayed >= targetRounds && didDisconnect && didReconnect) {
      console.log(`\nSUCCESS: Completed ${roundsPlayed} rounds with disconnect/reconnect!`);
      console.log(`Seat preserved: ${mySeat === state.mySeat}`);
      socket.disconnect();
      process.exit(0);
    }

    // Trigger disconnect after round 2
    if (roundsPlayed === disconnectAfterRound && !didDisconnect) {
      didDisconnect = true;
      log('=== SIMULATING DISCONNECT (screen off) ===');
      socket.disconnect();

      // Wait 3 seconds (bot plays), then reconnect
      setTimeout(() => {
        log('=== RECONNECTING ===');
        connect(true);
      }, 3000);
      return;
    }

    return;
  }

  if (!myTurn) return;

  // Handle support signal response
  if (phase === 'bidding' || phase === 'bidding_forced') {
    const partner = (mySeat + 2) % 4;
    if (supportAsked[partner] && supportSignals[mySeat] === null) {
      log('Giving support signal: Pass');
      socket.emit('give_support', { signal: 'Pass' });
      return;
    }
  }

  if (phase === 'bidding') {
    log('Bidding 10 spades');
    socket.emit('place_bid', { bid: 10, trump: 'S' });
    return;
  }

  if (phase === 'bidding_forced') {
    log('Forced bid: 8 spades');
    socket.emit('place_bid', { bid: 8, trump: 'S' });
    return;
  }

  if (phase === 'partner_reveal') {
    if (biddingSeat === mySeat) {
      log('Starting play (partner reveal)');
      socket.emit('start_play', {});
    }
    return;
  }

  if (phase === 'playing' && playableCards.length > 0) {
    const card = pickCard(playableCards);
    log(`Playing ${card}`);
    socket.emit('play_card', { card });
    return;
  }
}

console.log('Starting reconnection test...\n');
console.log(`PlayerId: ${PLAYER_ID}`);
console.log(`Plan: Play ${disconnectAfterRound} rounds, disconnect, reconnect, play ${targetRounds - disconnectAfterRound} more rounds\n`);
connect(false);

// Safety timeout
setTimeout(() => {
  console.error(`\nTIMEOUT: Test did not complete within 3 minutes`);
  console.error(`Rounds: ${roundsPlayed}, disconnected: ${didDisconnect}, reconnected: ${didReconnect}`);
  process.exit(1);
}, 3 * 60 * 1000);
