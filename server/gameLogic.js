'use strict';

// ---------------------------------------------------------------------------
// Card helpers
// ---------------------------------------------------------------------------

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['S', 'H', 'D', 'C'];

function cardSuit(card) {
  return card.slice(-1);
}

function cardRank(card) {
  return RANKS.indexOf(card.slice(0, -1));
}

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(rank + suit);
    }
  }
  return deck; // sorted: 2S..AS, 2H..AH, 2D..AD, 2C..AC
}

function shuffle(deck) {
  // Fisher-Yates for proper randomization
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cutShuffle(deck, times) {
  deck = shuffle(deck);
  for (let i = 0; i < times; i++) {
    const cut = Math.floor(Math.random() * (deck.length - 1)) + 1;
    deck = [...deck.slice(cut), ...deck.slice(0, cut)];
  }
  return deck;
}

function cutOnly(deck, times) {
  deck = [...deck];
  for (let i = 0; i < times; i++) {
    const cut = Math.floor(Math.random() * (deck.length - 1)) + 1;
    deck = [...deck.slice(cut), ...deck.slice(0, cut)];
  }
  return deck;
}

// ---------------------------------------------------------------------------
// Trick evaluation
// ---------------------------------------------------------------------------

function trickWinner(trick, trump) {
  const ledSuit = cardSuit(trick[0].card);
  let winner = trick[0];
  for (const play of trick.slice(1)) {
    const suit = cardSuit(play.card);
    const winSuit = cardSuit(winner.card);
    const rank = cardRank(play.card);
    const winRank = cardRank(winner.card);
    const isTrump = suit === trump;
    const winIsTrump = winSuit === trump;
    if (isTrump && !winIsTrump) { winner = play; continue; }
    if (!isTrump && winIsTrump) continue;
    if (suit === winSuit && rank > winRank) winner = play;
  }
  return winner.seat;
}

// ---------------------------------------------------------------------------
// Playable cards (follow-suit enforcement)
// ---------------------------------------------------------------------------

function getPlayableCards(hand, currentTrick) {
  if (currentTrick.length === 0) {
    // Leading — all cards playable
    return [...hand];
  }
  const ledSuit = cardSuit(currentTrick[0].card);
  const suitCards = hand.filter(c => cardSuit(c) === ledSuit);
  if (suitCards.length > 0) return suitCards;
  return [...hand];
}

// ---------------------------------------------------------------------------
// TRAM validation
// ---------------------------------------------------------------------------

/**
 * Validate a TRAM claim.
 * @param {string[]} claimedCards - ordered cards the claimer will play
 * @param {number} claimerSeat
 * @param {Object} hands - {0:[],1:[],2:[],3:[]}  (current state, before removing claimed cards)
 * @param {string} trump
 * @param {number} bid
 * @param {Object} tricks - {0,1,2,3} tricks won so far
 * @returns {{ valid: boolean }}
 */
function validateTram(claimedCards, claimerSeat, hands, trump, bid, tricks) {
  // Work on copies
  const remainingHands = {};
  for (let s = 0; s < 4; s++) {
    remainingHands[s] = [...hands[s]];
  }

  const opponents = [0, 1, 2, 3].filter(s => (s % 2) !== (claimerSeat % 2));

  for (const card of claimedCards) {
    // Remove card from claimer's hand
    const idx = remainingHands[claimerSeat].indexOf(card);
    if (idx === -1) return { valid: false, reason: 'Card not in hand' };
    remainingHands[claimerSeat].splice(idx, 1);

    const ledSuit = cardSuit(card);
    const ledRank = cardRank(card);
    const isTrump = ledSuit === trump;

    // Check each opponent and simulate them playing a card
    for (const opp of opponents) {
      const oppHand = remainingHands[opp];
      if (oppHand.length === 0) continue;

      const suitCards = oppHand.filter(c => cardSuit(c) === ledSuit);
      if (suitCards.length > 0) {
        // Opponent must follow suit — can they beat the card?
        const bestInSuit = suitCards.reduce((best, c) => cardRank(c) > cardRank(best) ? c : best);
        if (cardRank(bestInSuit) > ledRank) {
          return { valid: false, reason: `Opponent at seat ${opp} can beat ${card} in suit` };
        }
        // Opponent follows but can't beat — remove their lowest card in suit
        // (worst case: conserves their higher cards for later)
        const lowestInSuit = suitCards.reduce((low, c) => cardRank(c) < cardRank(low) ? c : low);
        const removeIdx = oppHand.indexOf(lowestInSuit);
        if (removeIdx !== -1) oppHand.splice(removeIdx, 1);
      } else {
        // Opponent is void in led suit — can they trump?
        if (!isTrump) {
          const oppTrumps = oppHand.filter(c => cardSuit(c) === trump);
          if (oppTrumps.length > 0) {
            return { valid: false, reason: `Opponent at seat ${opp} can trump ${card}` };
          }
        }
        // Led is trump and opponent has no trump — can't beat it
      }
    }
  }

  return { valid: true };
}

/**
 * Validate a TRAM claim when bidder controls partner's hand (bid >= 10).
 * Simulates full 4-player tricks with both team members' cards.
 * @param {string[]} myCards - ordered cards the bidder will play
 * @param {string[]} partnerCards - ordered cards the partner will play
 * @param {number} bidderSeat
 * @param {Object} hands - {0:[],1:[],2:[],3:[]}
 * @param {string} trump
 * @param {number} activeSeat - who leads the first trick
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateTramDual(myCards, partnerCards, bidderSeat, hands, trump, activeSeat) {
  if (myCards.length !== partnerCards.length) {
    return { valid: false, reason: 'Must select same number of cards from each hand' };
  }

  const partnerSeat = (bidderSeat + 2) % 4;
  const opponents = [0, 1, 2, 3].filter(s => (s % 2) !== (bidderSeat % 2));

  // Work on copies
  const remainingHands = {};
  for (let s = 0; s < 4; s++) {
    remainingHands[s] = [...hands[s]];
  }

  let leader = activeSeat;

  for (let i = 0; i < myCards.length; i++) {
    // Determine who leads and who follows based on trick winner
    let leadSeat, followSeat, leadCard, followCard;
    if (leader === partnerSeat) {
      leadSeat = partnerSeat;
      followSeat = bidderSeat;
      leadCard = partnerCards[i];
      followCard = myCards[i];
    } else {
      leadSeat = bidderSeat;
      followSeat = partnerSeat;
      leadCard = myCards[i];
      followCard = partnerCards[i];
    }

    // Validate and remove lead card
    const leadIdx = remainingHands[leadSeat].indexOf(leadCard);
    if (leadIdx === -1) return { valid: false, reason: `Card ${leadCard} not in ${leadSeat === bidderSeat ? 'your' : "partner's"} hand` };
    remainingHands[leadSeat].splice(leadIdx, 1);

    const ledSuit = cardSuit(leadCard);

    // Build trick in clockwise order from leader
    const trick = [{ seat: leadSeat, card: leadCard }];

    // Play clockwise from leader
    for (let offset = 1; offset <= 3; offset++) {
      const seat = (leadSeat + offset) % 4;

      if (seat === followSeat) {
        // Teammate follows — validate follow-suit rules
        const followSuit = cardSuit(followCard);
        const suitCards = remainingHands[followSeat].filter(c => cardSuit(c) === ledSuit);
        if (suitCards.length > 0 && followSuit !== ledSuit) {
          return { valid: false, reason: `Partner must follow suit (${ledSuit}) but selected ${followCard}` };
        }
        const followIdx = remainingHands[followSeat].indexOf(followCard);
        if (followIdx === -1) return { valid: false, reason: `Card ${followCard} not in ${followSeat === bidderSeat ? 'your' : "partner's"} hand` };
        remainingHands[followSeat].splice(followIdx, 1);
        trick.push({ seat: followSeat, card: followCard });
      } else {
        // Opponent seat — simulate worst-case play
        const oppHand = remainingHands[seat];
        if (oppHand.length === 0) {
          trick.push({ seat, card: null });
          continue;
        }

        const suitCards = oppHand.filter(c => cardSuit(c) === ledSuit);
        if (suitCards.length > 0) {
          // Must follow suit — check if best card can win trick
          const bestInSuit = suitCards.reduce((best, c) => cardRank(c) > cardRank(best) ? c : best);
          // Check if this card would win the trick so far
          const testTrick = [...trick, { seat, card: bestInSuit }];
          const testWinner = trickWinner(testTrick, trump);
          if (testWinner === seat) {
            return { valid: false, reason: `Opponent at seat ${seat} can beat with ${bestInSuit}` };
          }
          // Can't win — play lowest card to conserve
          const lowestInSuit = suitCards.reduce((low, c) => cardRank(c) < cardRank(low) ? c : low);
          const removeIdx = oppHand.indexOf(lowestInSuit);
          if (removeIdx !== -1) oppHand.splice(removeIdx, 1);
          trick.push({ seat, card: lowestInSuit });
        } else {
          // Void in led suit — can they trump?
          const oppTrumps = oppHand.filter(c => cardSuit(c) === trump);
          if (oppTrumps.length > 0) {
            // Check if their best trump would win the trick
            const bestTrump = oppTrumps.reduce((best, c) => cardRank(c) > cardRank(best) ? c : best);
            const testTrick = [...trick, { seat, card: bestTrump }];
            const testWinner = trickWinner(testTrick, trump);
            if (testWinner === seat) {
              return { valid: false, reason: `Opponent at seat ${seat} can trump with ${bestTrump}` };
            }
            // Their trump doesn't win (teammate has higher trump) — play lowest trump
            const lowestTrump = oppTrumps.reduce((low, c) => cardRank(c) < cardRank(low) ? c : low);
            const removeIdx = oppHand.indexOf(lowestTrump);
            if (removeIdx !== -1) oppHand.splice(removeIdx, 1);
            trick.push({ seat, card: lowestTrump });
          } else {
            // No suit, no trump — discard lowest card
            const lowest = oppHand.reduce((low, c) => cardRank(c) < cardRank(low) ? c : low);
            const removeIdx = oppHand.indexOf(lowest);
            if (removeIdx !== -1) oppHand.splice(removeIdx, 1);
            trick.push({ seat, card: lowest });
          }
        }
      }
    }

    // Verify trick winner is on claiming team
    const validTrick = trick.filter(t => t.card !== null);
    const winner = trickWinner(validTrick, trump);
    if (winner % 2 !== bidderSeat % 2) {
      return { valid: false, reason: `Opponent wins trick ${i + 1}` };
    }

    // Winner leads next trick
    leader = winner;
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// SurriGame
// ---------------------------------------------------------------------------

class SurriGame {
  /**
   * @param {Array<{name:string, isBot:boolean}>} seats - index 0-3
   */
  constructor(seats) {
    this.seats = seats; // [{name, isBot}]

    // Public state
    this.phase = 'dealing';
    this.dealer = 0;
    this.dealerScore = 0;
    this.losses = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.round = 1;
    this._isFirstDeal = true;
    this._roundsWithoutBid10 = 0;
    this._lastDeck = null;

    // Round state
    this.hands = { 0: [], 1: [], 2: [], 3: [] };
    this.trump = null;
    this.bid = null;
    this.biddingSeat = null;
    this.biddingTeam = null;
    this.bidHistory = [];
    this.supportSignals = { 0: null, 1: null, 2: null, 3: null };
    this.supportAsked = { 0: false, 1: false, 2: false, 3: false };
    this.pendingSupportRequest = null; // { asker: seat }
    this.activeSeat = null;

    this.tricks = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.currentTrick = [];
    this.lastTrick = null;
    this.lastRoundResult = null;

    this._tricksPlayed = 0; // total tricks completed this round
    this.playedCards = []; // all cards played this round (for AI tracking)
    this.voidSuits = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() }; // suits each seat has shown void in
    this.dhaaps = {}; // { seat: true } — seats that declared Dhaap this trick
    this.completedTricks = []; // [{winner, cards: [{seat, card}...]}]
  }

  // -------------------------------------------------------------------------
  // Round start
  // -------------------------------------------------------------------------

  startRound(firstDealer) {
    if (firstDealer !== undefined) {
      this.dealer = firstDealer;
    }

    // Reset round state
    this.phase = 'bidding';
    this.trump = null;
    this.bid = null;
    this.biddingSeat = null;
    this.biddingTeam = null;
    this.bidHistory = [];
    this.supportSignals = { 0: null, 1: null, 2: null, 3: null };
    this.supportAsked = { 0: false, 1: false, 2: false, 3: false };
    this.pendingSupportRequest = null;
    this.tricks = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.currentTrick = [];
    this.lastTrick = null;
    this.lastRoundResult = null;
    this.tramResult = null;
    this._tricksPlayed = 0;
    this.playedCards = [];
    this.voidSuits = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
    this.dhaaps = {};
    this.completedTricks = [];

    // Deal
    this._deal();

    // First bidder is left of dealer
    this.activeSeat = (this.dealer + 1) % 4;

    return { ok: true };
  }

  _gatherCards() {
    const deck = [];
    // Collect tricks won by each seat, starting from dealer clockwise
    // Group tricks by winner
    const tricksBySeat = { 0: [], 1: [], 2: [], 3: [] };
    for (const trick of this.completedTricks) {
      tricksBySeat[trick.winner].push(trick.cards);
    }
    // Dealer picks up first, then clockwise
    for (let i = 0; i < 4; i++) {
      const seat = (this.dealer + i) % 4;
      for (const trickCards of tricksBySeat[seat]) {
        for (const play of trickCards) {
          deck.push(play.card);
        }
      }
    }
    // Append unplayed cards (TRAM/give-up) — dealer clockwise
    for (let i = 0; i < 4; i++) {
      const seat = (this.dealer + i) % 4;
      if (this.hands[seat]) {
        for (const card of this.hands[seat]) {
          deck.push(card);
        }
      }
    }
    // Append any cards left in currentTrick (give-up mid-trick)
    for (const play of this.currentTrick) {
      deck.push(play.card);
    }
    if (deck.length !== 52) {
      const missing = 52 - deck.length;
      console.warn(
        `[gameLogic] _gatherCards produced ${deck.length}/52 cards (missing ${missing}). ` +
        `completedTricks=${this.completedTricks.length}, ` +
        `hands=[${[0,1,2,3].map(s => (this.hands[s] || []).length).join(',')}], ` +
        `currentTrick=${this.currentTrick.length}. Discarding — next deal will reshuffle.`
      );
      this._lastDeck = null;
      return;
    }
    this._lastDeck = deck;
  }

  _deal() {
    let deck;
    if (this._isFirstDeal) {
      deck = cutShuffle(buildDeck(), 15);
      this._isFirstDeal = false;
    } else if (this._lastDeck && this._lastDeck.length === 52) {
      const humanCount = this.seats.filter(s => !s.isBot).length;
      let cuts = 5;
      if (this._roundsWithoutBid10 > 5 && humanCount > 1) {
        cuts = Math.max(2, 5 - (this._roundsWithoutBid10 - 5));
      }
      deck = cutOnly(this._lastDeck, cuts);
    } else {
      deck = cutShuffle(buildDeck(), 5);
    }

    // Deal clockwise starting from (dealer+1)%4, one card at a time
    const hands = { 0: [], 1: [], 2: [], 3: [] };
    let cardIdx = 0;
    for (let card = 0; card < 13; card++) {
      for (let i = 0; i < 4; i++) {
        const seat = (this.dealer + 1 + i) % 4;
        hands[seat].push(deck[cardIdx++]);
      }
    }
    // Sanity check: every seat should have 13 defined cards.
    for (let s = 0; s < 4; s++) {
      if (hands[s].length !== 13 || hands[s].some(c => c == null)) {
        console.warn(
          `[gameLogic] _deal produced invalid hand for seat ${s} ` +
          `(len=${hands[s].length}, holes=${hands[s].filter(c => c == null).length}). Reshuffling.`
        );
        const fresh = cutShuffle(buildDeck(), 15);
        const reset = { 0: [], 1: [], 2: [], 3: [] };
        let idx = 0;
        for (let c = 0; c < 13; c++) {
          for (let i = 0; i < 4; i++) {
            reset[(this.dealer + 1 + i) % 4].push(fresh[idx++]);
          }
        }
        this.hands = reset;
        this._lastDeck = null;
        return;
      }
    }
    this.hands = hands;
  }

  // -------------------------------------------------------------------------
  // Bidding
  // -------------------------------------------------------------------------

  passBid(seat) {
    if (this.phase !== 'bidding' && this.phase !== 'bidding_forced') {
      return { ok: false, error: 'Not in bidding phase' };
    }
    if (this.activeSeat !== seat) {
      return { ok: false, error: 'Not your turn' };
    }
    if (this.phase === 'bidding_forced') {
      return { ok: false, error: 'Must bid in forced bidding phase' };
    }

    this.bidHistory.push({ seat, action: 'pass' });

    // Check if all 4 have passed
    const passes = this.bidHistory.filter(h => h.action === 'pass').length;
    if (passes === 4) {
      // Forced bid — reset to player left of dealer
      this.phase = 'bidding_forced';
      this.activeSeat = (this.dealer + 1) % 4;
    } else {
      this.activeSeat = (seat + 1) % 4;
    }

    return { ok: true };
  }

  placeBid(seat, bid, trump) {
    if (this.phase !== 'bidding' && this.phase !== 'bidding_forced') {
      return { ok: false, error: 'Not in bidding phase' };
    }
    if (this.activeSeat !== seat) {
      return { ok: false, error: 'Not your turn' };
    }

    const minBid = this.phase === 'bidding_forced' ? 8 : 10;
    if (bid < minBid) {
      return { ok: false, error: `Bid must be at least ${minBid}` };
    }
    if (bid > 13) {
      return { ok: false, error: 'Bid cannot exceed 13' };
    }
    if (!SUITS.includes(trump)) {
      return { ok: false, error: 'Invalid trump suit' };
    }

    this.bid = bid;
    this.trump = trump;
    this.biddingSeat = seat;
    this.biddingTeam = seat % 2;
    this.bidHistory.push({ seat, action: 'bid', bid, trump });

    if (bid >= 10) {
      this.phase = 'partner_reveal';
      this.activeSeat = seat;
    } else {
      // bid 8 or 9 (forced only) — go straight to playing
      this.phase = 'playing';
      this.activeSeat = (this.dealer + 1) % 4;
    }

    return { ok: true };
  }

  askSupport(seat) {
    if (this.phase !== 'bidding' && this.phase !== 'bidding_forced') {
      return { ok: false, error: 'Not in bidding phase' };
    }
    if (this.activeSeat !== seat) {
      return { ok: false, error: 'Not your turn' };
    }
    if (this.supportAsked[seat]) {
      return { ok: false, error: 'Already asked for support this round' };
    }

    this.supportAsked[seat] = true;
    this.pendingSupportRequest = { asker: seat };

    // Partner must respond — activeSeat temporarily shifts to partner
    const partner = (seat + 2) % 4;
    this.activeSeat = partner;

    return { ok: true };
  }

  giveSupport(seat, signal) {
    if (!this.pendingSupportRequest) {
      return { ok: false, error: 'No pending support request' };
    }
    const partner = (seat + 2) % 4;
    if (this.pendingSupportRequest.asker !== partner) {
      return { ok: false, error: 'Not the partner being asked for support' };
    }
    if (!['Full', 'Major', 'Minor', 'Pass'].includes(signal)) {
      return { ok: false, error: 'Invalid support signal' };
    }

    this.supportSignals[seat] = signal;
    const asker = this.pendingSupportRequest.asker;
    this.pendingSupportRequest = null;

    // Return active seat to the asker
    this.activeSeat = asker;

    return { ok: true };
  }

  increaseBid(seat, bid) {
    if (this.phase !== 'partner_reveal') {
      return { ok: false, error: 'Not in partner reveal phase' };
    }
    if (this.biddingSeat !== seat) {
      return { ok: false, error: 'Only the bidder can increase the bid' };
    }
    if (bid <= this.bid) {
      return { ok: false, error: 'New bid must be higher than current bid' };
    }
    if (bid > 13) {
      return { ok: false, error: 'Bid cannot exceed 13' };
    }

    this.bid = bid;
    this.bidHistory.push({ seat, action: 'bid', bid, trump: this.trump });

    return { ok: true };
  }

  startPlay(seat) {
    if (this.phase !== 'partner_reveal') {
      return { ok: false, error: 'Not in partner reveal phase' };
    }
    if (this.biddingSeat !== seat) {
      return { ok: false, error: 'Only the bidder can start play' };
    }

    this.phase = 'playing';
    // Bid >= 10: bidder leads; otherwise left of dealer
    this.activeSeat = this.bid >= 10 ? this.biddingSeat : (this.dealer + 1) % 4;

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Playing
  // -------------------------------------------------------------------------

  playCard(seat, card) {
    if (this.phase !== 'playing') {
      return { ok: false, error: 'Not in playing phase' };
    }
    if (this.activeSeat !== seat) {
      return { ok: false, error: 'Not your turn' };
    }

    // If bid >= 10, bidder controls partner's card
    const effectiveSeat = seat;
    const partnerSeat = (this.biddingSeat + 2) % 4;
    if (this.bid >= 10 && seat === this.biddingSeat) {
      // Bidder can play from their own hand OR partner's hand
      const inOwnHand = this.hands[seat].includes(card);
      const inPartnerHand = this.hands[partnerSeat].includes(card);
      if (!inOwnHand && !inPartnerHand) {
        return { ok: false, error: 'Card not in hand' };
      }
      // Determine whose turn it actually is within the trick
      // activeSeat during partner control might be either bidder or partner
    }

    // Check card is in the active seat's hand
    // During bid >= 10, if it's partner's "turn" in the trick, bidder plays for them
    let playingSeat = seat;
    if (this.bid >= 10 && seat === this.biddingSeat) {
      // Bidder acts for both themselves and partner
      const inPartnerHand = this.hands[partnerSeat].includes(card);
      const inOwnHand = this.hands[seat].includes(card);
      if (inPartnerHand && !inOwnHand) {
        playingSeat = partnerSeat;
      }
    }

    // Validate card is in playingSeat's hand
    if (!this.hands[playingSeat].includes(card)) {
      return { ok: false, error: 'Card not in hand' };
    }

    // Validate follow-suit
    const playable = getPlayableCards(this.hands[playingSeat], this.currentTrick);
    if (!playable.includes(card)) {
      return { ok: false, error: 'Must follow suit' };
    }

    // Detect void: if trick has a led card and player is not following suit
    if (this.currentTrick.length > 0) {
      const ledSuit = cardSuit(this.currentTrick[0].card);
      if (cardSuit(card) !== ledSuit) {
        this.voidSuits[playingSeat].add(ledSuit);
      }
    }

    // Play the card
    this.hands[playingSeat] = this.hands[playingSeat].filter(c => c !== card);
    this.currentTrick.push({ seat: playingSeat, card });

    if (this.currentTrick.length === 4) {
      // Don't resolve yet — let server broadcast all 4 cards first, then call resolveTrick()
      this.activeSeat = null; // no one's turn during trick resolution
      return { ok: true, trickComplete: true };
    } else {
      // Next player
      this._advancePlaySeat();
      return { ok: true };
    }
  }

  declareDhaap(seat) {
    if (this.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    if (this.activeSeat !== seat) return { ok: false, error: 'Not your turn' };
    if (this.dhaaps[seat]) return { ok: false, error: 'Already declared Dhaap this trick' };
    this.dhaaps[seat] = true;
    return { ok: true };
  }

  _advancePlaySeat() {
    const lastPlayed = this.currentTrick[this.currentTrick.length - 1].seat;
    let next = (lastPlayed + 1) % 4;

    // If bid >= 10, bidder controls partner — so when it's partner's turn, it's actually bidder's turn
    if (this.bid >= 10) {
      const partner = (this.biddingSeat + 2) % 4;
      if (next === partner) {
        this.activeSeat = this.biddingSeat;
      } else {
        this.activeSeat = next;
      }
    } else {
      this.activeSeat = next;
    }
  }

  resolveTrick() {
    if (this.currentTrick.length !== 4) {
      return { ok: false, error: 'Trick not complete' };
    }
    return this._resolveTrick();
  }

  _resolveTrick() {
    const winner = trickWinner(this.currentTrick, this.trump);
    this.tricks[winner]++;
    this._tricksPlayed++;
    // Track all played cards for AI reasoning
    for (const play of this.currentTrick) {
      this.playedCards.push(play.card);
    }
    this.lastTrick = { winner, cards: [...this.currentTrick] };
    this.completedTricks.push({ winner, cards: [...this.currentTrick] });
    this.currentTrick = [];
    this.dhaaps = {};

    // Check for early round end
    const bidTeamTricks = this._getBidTeamTricks();
    const defTeamTricks = this._getDefTeamTricks();
    const defTarget = 14 - this.bid;

    if (bidTeamTricks >= this.bid || defTeamTricks >= defTarget) {
      return this._endRound();
    }

    // Set next leader
    if (this.bid >= 10) {
      const partner = (this.biddingSeat + 2) % 4;
      if (winner === partner) {
        this.activeSeat = this.biddingSeat;
      } else {
        this.activeSeat = winner;
      }
    } else {
      this.activeSeat = winner;
    }

    return { ok: true };
  }

  _getBidTeamTricks() {
    const t = this.biddingTeam;
    return this.tricks[t === 0 ? 0 : 1] + this.tricks[t === 0 ? 2 : 3];
  }

  _getDefTeamTricks() {
    const t = 1 - this.biddingTeam;
    return this.tricks[t === 0 ? 0 : 1] + this.tricks[t === 0 ? 2 : 3];
  }

  // -------------------------------------------------------------------------
  // TRAM
  // -------------------------------------------------------------------------

  callTram(seat, cards, partnerCards = null) {
    if (this.phase !== 'playing') {
      return { ok: false, error: 'Not in playing phase' };
    }

    // Only the player who leads the next trick can call TRAM
    if (this.currentTrick.length > 0) {
      return { ok: false, error: 'Cannot call TRAM mid-trick' };
    }
    if (this.activeSeat !== seat) {
      return { ok: false, error: 'Only the trick leader can call TRAM' };
    }

    const callerTeam = seat % 2;
    const useDual = this.bid >= 10 && seat === this.biddingSeat && partnerCards;
    const result = useDual
      ? validateTramDual(cards, partnerCards, seat, this.hands, this.trump, this.activeSeat)
      : validateTram(cards, seat, this.hands, this.trump, this.bid, this.tricks);

    if (result.valid) {
      const tricksNeeded = this._tricksNeededForClaimer(seat);
      for (const card of cards) {
        this.tricks[seat]++;
      }
    } else {
      // Invalid TRAM — all remaining tricks go to opponents
      const bidTeamTricks = this._getBidTeamTricks();
      const defTeamTricks = this._getDefTeamTricks();
      const defTarget = 14 - this.bid;

      if (callerTeam === this.biddingTeam) {
        const oppSeats = [0, 1, 2, 3].filter(s => s % 2 !== this.biddingTeam);
        this.tricks[oppSeats[0]] += defTarget - defTeamTricks;
      } else {
        const bidSeats = [0, 1, 2, 3].filter(s => s % 2 === this.biddingTeam);
        this.tricks[bidSeats[0]] += this.bid - bidTeamTricks;
      }
    }

    // Store TRAM result so clients can display it before scoring
    this.tramResult = {
      callerSeat: seat,
      callerName: this.seats[seat]?.name ?? `Player ${seat}`,
      valid: result.valid,
      cards,
      partnerCards: partnerCards || null,
      failReason: result.reason || null,
    };

    // Transition to scoring (which shows TRAM result + round summary)
    return this._endRound();
  }

  giveUp(seat) {
    if (this.phase !== 'playing') {
      return { ok: false, error: 'Not in playing phase' };
    }

    // Award all remaining tricks to the opponent team
    const giverTeam = seat % 2;
    const totalPlayed = this.tricks[0] + this.tricks[1] + this.tricks[2] + this.tricks[3];
    const remaining = 13 - totalPlayed;
    if (remaining <= 0) {
      return { ok: false, error: 'No tricks remaining' };
    }

    // Give remaining tricks to a seat on the opponent team
    const oppSeat = giverTeam === 0 ? 1 : 0;
    this.tricks[oppSeat] += remaining;

    // Clear current trick if in progress
    this.currentTrick = [];

    return this._endRound();
  }

  _tricksNeededForClaimer(seat) {
    const callerTeam = seat % 2;
    if (callerTeam === this.biddingTeam) {
      return this.bid - this._getBidTeamTricks();
    } else {
      return (14 - this.bid) - this._getDefTeamTricks();
    }
  }

  // -------------------------------------------------------------------------
  // End round / scoring
  // -------------------------------------------------------------------------

  _endRound() {
    const bidTeamTricks = this._getBidTeamTricks();
    const made = bidTeamTricks >= this.bid;

    const dealerTeam = this.dealer % 2;
    let scoreDelta = 0;

    if (this.bid === 13) {
      // Bid-13 special handling — scoring deferred, handled in _applyScoring
      scoreDelta = 0;
    } else {
      if (this.biddingTeam === dealerTeam) {
        scoreDelta = made ? -this.bid : 2 * this.bid;
      } else {
        scoreDelta = made ? this.bid : -2 * this.bid;
      }
    }

    const newScore = this.bid === 13 ? 0 : this.dealerScore + scoreDelta;

    // Compute dealer change
    let dealerChanged = false;
    let newDealer = null;
    let dealerChangeReason = null;
    let loser = null;
    let gameOver = false;
    let winner = null;

    if (this.bid === 13) {
      // Bid-13 instant win/lose
      dealerChangeReason = 'bid13';
      this.dealerScore = 0;

      if (made) {
        // Bidding team wins — opposing side's dealer (or appropriate player) takes a loss
        // Loser is from non-bidding team
        if (this.biddingTeam === dealerTeam) {
          // Dealing team bid 13 and made it — opponent side's ...
          // Table row: "Dealing team bid 13 | Made it | Opponent side | Anti-clockwise from current dealer"
          loser = [0, 1, 2, 3].find(s => s % 2 !== dealerTeam && s !== (this.dealer + 3) % 4)
            ?? [0, 1, 2, 3].find(s => s % 2 !== dealerTeam);
          newDealer = (this.dealer + 3) % 4; // anti-clockwise = (dealer - 1 + 4) % 4
        } else {
          // Non-dealing team bid 13 and made it — dealing team takes loss
          // Table row: "Non-dealing team bid 13 | Made it (won) | Dealing team | Partner of current dealer"
          loser = this.dealer;
          newDealer = (this.dealer + 2) % 4;
        }
      } else {
        // Bidding team fails
        if (this.biddingTeam === dealerTeam) {
          // Dealing team bid 13 and failed — dealing team loses
          // Table row: "Dealing team bid 13 | Failed | Dealing team | Partner of current dealer"
          loser = this.dealer;
          newDealer = (this.dealer + 2) % 4;
        } else {
          // Non-dealing team bid 13 and failed — non-dealing team loses
          // Table row: "Non-dealing team bid 13 | Failed (lost) | Non-dealing team | Counter-clockwise from current dealer"
          loser = this.biddingSeat;
          newDealer = (this.dealer + 3) % 4; // counter-clockwise
        }
      }

      this.losses[loser]++;
      dealerChanged = newDealer !== this.dealer;
      this.dealer = newDealer;

    } else {
      // Normal scoring
      this.dealerScore = newScore;

      if (this.dealerScore >= 52) {
        // Trigger 1: score >= 52
        dealerChangeReason = 'score_overflow';
        loser = this.dealer;
        this.losses[loser]++;
        this.dealerScore = 0;
        newDealer = (this.dealer + 2) % 4; // partner
        dealerChanged = true;
        this.dealer = newDealer;

      } else if (this.dealerScore < 0) {
        // Trigger 2: score goes negative
        dealerChangeReason = 'score_negative';
        this.dealerScore = Math.abs(this.dealerScore);
        newDealer = (this.dealer + 1) % 4; // next clockwise
        dealerChanged = true;
        this.dealer = newDealer;
      }
      // else: dealer stays
    }

    // Check game over
    const lostPlayers = [0, 1, 2, 3].filter(s => this.losses[s] > 0);
    if (lostPlayers.length >= 3) {
      gameOver = true;
      winner = [0, 1, 2, 3].find(s => this.losses[s] === 0);
    }

    this.lastRoundResult = {
      biddingSeat: this.biddingSeat,
      bid: this.bid,
      trump: this.trump,
      biddingTeamTricks: bidTeamTricks,
      defendingTeamTricks: this._getDefTeamTricks(),
      made,
      scoreDelta: this.bid === 13 ? 0 : scoreDelta,
      newScore: this.dealerScore,
      dealerChanged,
      newDealer: dealerChanged ? this.dealer : null,
      dealerChangeReason,
      loser,
      gameOver,
      winner,
    };

    // Gather cards for next round's deal and track bid-10 streak
    this._gatherCards();
    if (this.bid >= 10) {
      this._roundsWithoutBid10 = 0;
    } else {
      this._roundsWithoutBid10++;
    }

    this.phase = 'scoring';
    this.activeSeat = null;

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  getStateFor(seat) {
    const partner = (seat + 2) % 4;
    const myTurn = this.activeSeat === seat
      || (this.bid >= 10 && this.activeSeat === this.biddingSeat && seat === this.biddingSeat)
      || (this.pendingSupportRequest && this.activeSeat === seat);

    const isBidderControl = this.phase === 'playing' && this.bid >= 10
      && this.activeSeat === this.biddingSeat && seat === this.biddingSeat;
    const playableCards = isBidderControl
      ? this._getBidderPlayableCards(seat)
      : (this.phase === 'playing' && this.activeSeat === seat)
        ? getPlayableCards(this.hands[seat], this.currentTrick)
        : [];

    // True when it's the bidder's turn to pick a card from their partner's hand
    const playingForPartner = isBidderControl && (() => {
      const p = (seat + 2) % 4;
      const firstLeader = this.bid >= 10 ? this.biddingSeat : (this.dealer + 1) % 4;
      const nextSeat = this.currentTrick.length === 0
        ? (this.lastTrick ? this.lastTrick.winner : firstLeader)
        : (this.currentTrick[this.currentTrick.length - 1].seat + 1) % 4;
      return nextSeat === p;
    })();

    return {
      phase: this.phase,

      seats: [0, 1, 2, 3].map(s => ({
        name: this.seats[s]?.name ?? `Player ${s}`,
        isBot: this.seats[s]?.isBot ?? false,
        isConnected: this.seats[s]?.isConnected ?? true,
        isTempBot: this.seats[s]?.isTempBot ?? false,
        losses: this.losses[s],
      })),

      mySeat: seat,
      dealer: this.dealer,
      dealerScore: this.dealerScore,
      round: this.round,

      trump: this.trump,
      bid: this.bid,
      biddingSeat: this.biddingSeat,
      biddingTeam: this.biddingTeam,
      bidHistory: this.bidHistory,
      supportSignals: { ...this.supportSignals },
      supportAsked: { ...this.supportAsked },
      pendingSupportRequest: this.pendingSupportRequest ? { ...this.pendingSupportRequest } : null,

      activeSeat: this.activeSeat,
      tricks: { ...this.tricks },
      currentTrick: [...this.currentTrick],
      dhaaps: { ...this.dhaaps },
      lastTrick: this.lastTrick,

      myHand: [...(this.hands[seat] || [])],
      partnerHand: (this.bid >= 10 && this.biddingSeat != null)
        ? [...(this.hands[(this.biddingSeat + 2) % 4] || [])]
        : null,
      handSizes: {
        0: this.hands[0].length,
        1: this.hands[1].length,
        2: this.hands[2].length,
        3: this.hands[3].length,
      },

      myTurn: this.activeSeat === seat,
      playableCards,
      playingForPartner,

      lastRoundResult: this.lastRoundResult,
      tramResult: this.tramResult,
    };
  }

  _getBidderPlayableCards(seat) {
    if (seat !== this.biddingSeat) return [];
    const partner = (seat + 2) % 4;
    // The bidder plays cards for whichever hand is "next" in the trick
    // Figure out whose turn it is in the trick sequence
    const playedSeats = this.currentTrick.map(p => p.seat);
    const firstLeader = this.bid >= 10 ? this.biddingSeat : (this.dealer + 1) % 4;
    let nextSeat = this.currentTrick.length === 0
      ? (this.lastTrick ? this.lastTrick.winner : firstLeader)
      : (this.currentTrick[this.currentTrick.length - 1].seat + 1) % 4;

    if (nextSeat === partner) {
      // Playing from partner's hand
      return getPlayableCards(this.hands[partner], this.currentTrick);
    } else {
      return getPlayableCards(this.hands[seat], this.currentTrick);
    }
  }

  isGameOver() {
    if (this.lastRoundResult?.gameOver) {
      return this.lastRoundResult.winner;
    }
    const lostPlayers = [0, 1, 2, 3].filter(s => this.losses[s] > 0);
    if (lostPlayers.length >= 3) {
      return [0, 1, 2, 3].find(s => this.losses[s] === 0);
    }
    return null;
  }
}

module.exports = { SurriGame, RANKS, SUITS, cardRank, cardSuit, getPlayableCards, trickWinner };
