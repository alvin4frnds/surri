'use strict';

process.env.FAST_TEST = '1';

const assert = require('assert');
const { SurriGame } = require('./gameLogic');

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  PASS: ${name}`); }
function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err.message}`); }

function makeSeats() {
  return [
    { name: 'P0', isBot: false, isConnected: true },
    { name: 'P1', isBot: false, isConnected: true },
    { name: 'P2', isBot: false, isConnected: true },
    { name: 'P3', isBot: false, isConnected: true },
  ];
}

// Drive a game into bidding phase with a known dealer so we know whose turn
// it is without having to replay deals.
function gameInBidding(dealer = 0) {
  const game = new SurriGame(makeSeats());
  game.phase = 'bidding';
  game.dealer = dealer;
  game.activeSeat = (dealer + 1) % 4;
  game.hands = { 0: [], 1: [], 2: [], 3: [] };
  game.bid = null;
  game.trump = null;
  game.biddingSeat = null;
  game.biddingTeam = null;
  game.bidHistory = [];
  return game;
}

// ---------------------------------------------------------------------------
// 9a. Happy-path overbid
// ---------------------------------------------------------------------------
console.log('\n--- 9a. Happy-path overbid ---');
try {
  const g = gameInBidding(0); // dealer 0 → seat 1 acts first

  // Seat 1 bids 10 ♠
  assert.strictEqual(g.placeBid(1, 10, 'S').ok, true, 'seat 1 bid ok');
  assert.strictEqual(g.phase, 'bidding_raise');
  assert.strictEqual(g.activeSeat, 2);
  assert.deepStrictEqual(g.raiseSeatsRemaining, [2, 3, 0]);
  // Partner hand must be null for every seat while window is open
  for (let s = 0; s < 4; s++) {
    assert.strictEqual(g.getStateFor(s).partnerHand, null, `partnerHand null for seat ${s}`);
  }
  ok('9a.1 raise window opens after bid 10');

  // Seat 2 pass_raise
  assert.strictEqual(g.passRaise(2).ok, true);
  assert.strictEqual(g.phase, 'bidding_raise');
  assert.strictEqual(g.activeSeat, 3);
  ok('9a.2 pass advances to seat 3');

  // Seat 3 raise to 11 ♥
  assert.strictEqual(g.raiseBid(3, 11, 'H').ok, true);
  assert.strictEqual(g.bid, 11);
  assert.strictEqual(g.trump, 'H');
  assert.strictEqual(g.biddingSeat, 3);
  assert.strictEqual(g.biddingTeam, 1);
  assert.strictEqual(g.phase, 'bidding_raise');
  assert.strictEqual(g.activeSeat, 0);
  ok('9a.3 raise updates bid+trump+biddingSeat');

  // Seat 0 pass_raise — window closes, partner_reveal begins
  assert.strictEqual(g.passRaise(0).ok, true);
  assert.strictEqual(g.phase, 'partner_reveal');
  assert.strictEqual(g.activeSeat, 3); // final bidder
  ok('9a.4 window closes after 3 acts → partner_reveal');
} catch (e) { fail('9a happy path', e); }

// ---------------------------------------------------------------------------
// 9b. All pass the raise
// ---------------------------------------------------------------------------
console.log('\n--- 9b. All three pass ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  g.passRaise(2);
  g.passRaise(3);
  g.passRaise(0);
  assert.strictEqual(g.bid, 10);
  assert.strictEqual(g.trump, 'S');
  assert.strictEqual(g.biddingSeat, 1);
  assert.strictEqual(g.phase, 'partner_reveal');
  ok('9b final bidder unchanged after 3 passes');
} catch (e) { fail('9b all pass', e); }

// ---------------------------------------------------------------------------
// 9c. Multiple raises in one window
// ---------------------------------------------------------------------------
console.log('\n--- 9c. Multiple raises ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  g.raiseBid(2, 11, 'D');
  g.raiseBid(3, 12, 'C');
  g.passRaise(0);
  assert.strictEqual(g.bid, 12);
  assert.strictEqual(g.trump, 'C');
  assert.strictEqual(g.biddingSeat, 3);
  assert.strictEqual(g.phase, 'partner_reveal');
  ok('9c window does not reset on raises');
  // Attempting a second action by seat 2 must fail
  const retry = g.raiseBid(2, 13, 'H');
  assert.strictEqual(retry.ok, false);
  ok('9c seat 2 cannot act again');
} catch (e) { fail('9c multiple raises', e); }

// ---------------------------------------------------------------------------
// 9d. Forced-bid 8 or 9 does NOT open a window
// ---------------------------------------------------------------------------
console.log('\n--- 9d. Forced 8/9 → playing, no window ---');
try {
  const g = gameInBidding(0);
  // Force into bidding_forced by passing 4 times (seat order: 1, 2, 3, 0)
  g.passBid(1);
  g.passBid(2);
  g.passBid(3);
  g.passBid(0); // last pass flips to bidding_forced, activeSeat stays at (dealer+1)%4 = 1
  assert.strictEqual(g.phase, 'bidding_forced');
  assert.strictEqual(g.activeSeat, 1);
  assert.strictEqual(g.placeBid(1, 8, 'S').ok, true);
  assert.strictEqual(g.phase, 'playing');
  // raiseSeatsRemaining should not be populated
  assert.deepStrictEqual(g.raiseSeatsRemaining, []);
  ok('9d forced bid 8 skips raise window');
} catch (e) { fail('9d forced 8 no window', e); }

// ---------------------------------------------------------------------------
// 9e. Forced-bid ≥10 DOES open the window
// ---------------------------------------------------------------------------
console.log('\n--- 9e. Forced ≥10 → window opens ---');
try {
  const g = gameInBidding(0);
  g.passBid(1); g.passBid(2); g.passBid(3); g.passBid(0);
  assert.strictEqual(g.phase, 'bidding_forced');
  g.placeBid(1, 10, 'H');
  assert.strictEqual(g.phase, 'bidding_raise');
  assert.deepStrictEqual(g.raiseSeatsRemaining, [2, 3, 0]);
  ok('9e forced 10 opens raise window');
} catch (e) { fail('9e forced 10 window', e); }

// ---------------------------------------------------------------------------
// 9f. Raise to 13 is legal
// ---------------------------------------------------------------------------
console.log('\n--- 9f. Raise to 13 ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  assert.strictEqual(g.raiseBid(2, 13, 'H').ok, true);
  assert.strictEqual(g.bid, 13);
  g.passRaise(3);
  g.passRaise(0);
  assert.strictEqual(g.phase, 'partner_reveal');
  assert.strictEqual(g.biddingSeat, 2);
  ok('9f bid 13 via raise is accepted');
} catch (e) { fail('9f raise to 13', e); }

// ---------------------------------------------------------------------------
// 9g. Seat cannot act twice in the window
// ---------------------------------------------------------------------------
console.log('\n--- 9g. No re-bid after pass_raise ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  g.passRaise(2);
  // seat 2 tries again — not their turn, not in queue
  const retry = g.raiseBid(2, 11, 'H');
  assert.strictEqual(retry.ok, false);
  ok('9g seat 2 rejected after passing');
} catch (e) { fail('9g no re-bid', e); }

// ---------------------------------------------------------------------------
// 9h. Cannot raise below currentBid+1
// ---------------------------------------------------------------------------
console.log('\n--- 9h. Raise must exceed current bid ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  const bad = g.raiseBid(2, 10, 'H'); // equal to current bid
  assert.strictEqual(bad.ok, false);
  const bad2 = g.raiseBid(2, 9, 'H'); // below
  assert.strictEqual(bad2.ok, false);
  ok('9h server rejects raise ≤ currentBid');
} catch (e) { fail('9h raise below currentBid+1', e); }

// ---------------------------------------------------------------------------
// 9i. Partner hand stays hidden mid-window
// ---------------------------------------------------------------------------
console.log('\n--- 9i. Partner hand hidden during window ---');
try {
  const g = gameInBidding(0);
  // Seed real hands so a leak would show up
  g.hands = {
    0: ['AS', 'KS', 'QS'],
    1: ['AH', 'KH'],
    2: ['AD', 'KD', 'QD'],
    3: ['AC', 'KC', 'QC'],
  };
  g.placeBid(1, 10, 'S');
  g.raiseBid(2, 11, 'H'); // seat 2 raises — biddingSeat is now 2; partner would be seat 0
  for (let s = 0; s < 4; s++) {
    assert.strictEqual(g.getStateFor(s).partnerHand, null, `partnerHand null during bidding_raise for seat ${s}`);
  }
  g.passRaise(3);
  g.passRaise(0);
  // Now in partner_reveal — seat 0 (partner of bidder=seat 2) should be visible
  assert.strictEqual(g.phase, 'partner_reveal');
  for (let s = 0; s < 4; s++) {
    const view = g.getStateFor(s).partnerHand;
    assert.ok(Array.isArray(view), `partnerHand visible in partner_reveal for seat ${s}`);
    assert.deepStrictEqual([...view].sort(), ['AS', 'KS', 'QS'].sort(), `partnerHand is seat 0's hand for seat ${s}`);
  }
  ok('9i partner hand hidden during window, revealed after');
} catch (e) { fail('9i partner hand invariant', e); }

// ---------------------------------------------------------------------------
// 9k. Post-window increase_bid still works
// ---------------------------------------------------------------------------
console.log('\n--- 9k. increase_bid after window closes ---');
try {
  const g = gameInBidding(0);
  g.placeBid(1, 10, 'S');
  g.passRaise(2);
  g.passRaise(3);
  g.passRaise(0);
  assert.strictEqual(g.phase, 'partner_reveal');
  const r = g.increaseBid(g.biddingSeat, 11);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.bid, 11);
  ok('9k bidder can still increase bid post-window');
} catch (e) { fail('9k post-window increase', e); }

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
