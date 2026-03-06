'use strict';

// Headless test: connect as a human player with 3 bots, play 3 full games
const { io } = require('socket.io-client');

const SERVER = 'http://localhost:3000';
const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
let gamesPlayed = 0;
let gamesTarget = 3;
let roundsPlayed = 0;
let socket;
let wantToWin = false; // Strategy flag: true = play to win, false = play to lose

function log(msg) {
  console.log(`[Game ${gamesPlayed + 1} R${roundsPlayed}] ${msg}`);
}

function cardRankIndex(card) {
  const rank = card.slice(0, -1);
  return RANK_ORDER.indexOf(rank);
}

// Pick highest or lowest card depending on strategy
function pickCard(playableCards, highFirst) {
  if (playableCards.length === 1) return playableCards[0];
  const sorted = [...playableCards].sort((a, b) => cardRankIndex(a) - cardRankIndex(b));
  return highFirst ? sorted[sorted.length - 1] : sorted[0];
}

function connect() {
  socket = io(SERVER);

  socket.on('connect', () => {
    log('Connected. Creating room with 3 bots...');
    socket.emit('create_room', { name: 'TestPlayer', botCount: 3 });
  });

  socket.on('room_created', ({ code, seat }) => {
    log(`Room ${code} created, seat ${seat}. Starting game...`);
    socket.emit('start_game', {});
  });

  socket.on('error', ({ message }) => {
    console.error(`ERROR: ${message}`);
  });

  socket.on('game_state', ({ state }) => {
    handleGameState(state);
  });

  socket.on('disconnect', () => {
    log('Disconnected');
  });
}

function handleGameState(state) {
  const { phase, myTurn, mySeat, playableCards, myHand, lastRoundResult,
          bid, biddingSeat, trump, activeSeat, tricks, dealerScore, dealer,
          supportAsked, supportSignals, pendingSupportRequest } = state;

  const dealerTeam = dealer % 2;
  const myTeam = mySeat % 2;
  const dealerIsMyTeam = dealerTeam === myTeam;

  // Game over?
  if (lastRoundResult?.gameOver) {
    gamesPlayed++;
    const winner = state.seats[lastRoundResult.winner].name;
    const losses = [0,1,2,3].map(s => `${state.seats[s].name}: ${state.seats[s].losses} losses`).join(', ');
    console.log(`\n=== GAME ${gamesPlayed} OVER ===`);
    console.log(`Winner: ${winner}`);
    console.log(`Losses: ${losses}`);
    console.log(`Rounds played: ${roundsPlayed}`);
    console.log(`Final dealer score: ${dealerScore}\n`);

    if (gamesPlayed >= gamesTarget) {
      console.log(`All ${gamesTarget} games completed successfully!`);
      socket.disconnect();
      process.exit(0);
    } else {
      roundsPlayed = 0;
      socket.disconnect();
      setTimeout(connect, 500);
    }
    return;
  }

  // Scoring phase — track rounds
  if (phase === 'scoring' && lastRoundResult) {
    roundsPlayed++;
    const madeStr = lastRoundResult.made ? 'MADE' : 'FAILED';
    log(`Round end: bid ${lastRoundResult.bid}${lastRoundResult.trump} by seat ${lastRoundResult.biddingSeat} — ${madeStr}. ` +
      `Score: ${lastRoundResult.newScore} (delta: ${lastRoundResult.scoreDelta > 0 ? '+' : ''}${lastRoundResult.scoreDelta})` +
      (lastRoundResult.dealerChanged ? ` | Dealer changed to seat ${lastRoundResult.newDealer} (${lastRoundResult.dealerChangeReason})` : '') +
      (lastRoundResult.loser !== null ? ` | Seat ${lastRoundResult.loser} took a loss` : ''));
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

  // Bidding strategy:
  // Goal: make ALL 4 seats eventually lose (score overflow as dealer).
  //
  // When dealer is on MY team: I bid 10 and play badly → I fail → score += 20 (dealer team fails)
  //   → pushes score toward ≥52 → my team's dealer loses. Good for getting seats 0/2 to lose.
  //
  // When dealer is on OPPONENT team: I bid 10 and play WELL → I make it → score += 10 (non-dealer makes)
  //   → pushes opponent dealer's score toward ≥52 → opponent dealer loses. Good for seats 1/3.
  //   If I fail when opponent is dealer: score -= 20, goes negative, rotates away. BAD. Must try to win.
  if (phase === 'bidding') {
    // Always bid 10 — we control the outcome via card play strategy
    wantToWin = !dealerIsMyTeam; // Win when opponent is dealer, lose when my team is dealer
    log(`Bidding 10 spades (dealer seat ${dealer}, strategy: ${wantToWin ? 'WIN' : 'LOSE'})`);
    socket.emit('place_bid', { bid: 10, trump: 'S' });
    return;
  }

  if (phase === 'bidding_forced') {
    wantToWin = !dealerIsMyTeam;
    log(`Forced bid: 8 spades (dealer seat ${dealer}, strategy: ${wantToWin ? 'WIN' : 'LOSE'})`);
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

  // Playing phase — pick cards based on strategy
  if (phase === 'playing' && playableCards.length > 0) {
    const card = pickCard(playableCards, wantToWin);
    log(`Playing ${card} (from ${playableCards.length}, ${wantToWin ? 'trying to WIN' : 'trying to LOSE'})`);
    socket.emit('play_card', { card });
    return;
  }
}

console.log(`Starting ${gamesTarget} game test...\n`);
connect();

// Safety timeout
setTimeout(() => {
  console.error(`\nTIMEOUT: Games did not complete within 5 minutes`);
  console.error(`Games completed: ${gamesPlayed}, rounds in current game: ${roundsPlayed}`);
  process.exit(1);
}, 5 * 60 * 1000);
