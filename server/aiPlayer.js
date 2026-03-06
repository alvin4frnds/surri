'use strict';

const { RANKS, SUITS, cardRank, cardSuit, getPlayableCards } = require('./gameLogic');

// ---------------------------------------------------------------------------
// Hand evaluation helpers
// ---------------------------------------------------------------------------

function evaluateHand(hand, trump) {
  const trumpCards = hand.filter(c => cardSuit(c) === trump);
  const trump_tricks =
    trumpCards.filter(c => cardRank(c) >= RANKS.indexOf('10')).length +
    trumpCards.filter(c => {
      const r = cardRank(c);
      return r >= RANKS.indexOf('7') && r < RANKS.indexOf('10');
    }).length * 0.5;

  const nonTrump = hand.filter(c => cardSuit(c) !== trump);
  const suits = SUITS.filter(s => s !== trump);
  let side_tricks = 0;
  for (const suit of suits) {
    const suitCards = hand.filter(c => cardSuit(c) === suit);
    if (suitCards.length === 0) {
      side_tricks += 0.5; // void
      continue;
    }
    if (suitCards.some(c => c.startsWith('A'))) side_tricks += 1;
    if (suitCards.some(c => c.startsWith('K')) && suitCards.length >= 3) side_tricks += 0.5;
  }
  return trump_tricks + side_tricks;
}

function bestSuit(hand) {
  let best = SUITS[0];
  let bestScore = -1;
  for (const suit of SUITS) {
    const score = evaluateHand(hand, suit);
    if (score > bestScore) {
      bestScore = score;
      best = suit;
    }
  }
  return { suit: best, estimate: bestScore };
}

/**
 * Count sure tricks from combined hands.
 */
function countSureTricks(ownHand, partnerHand, trump) {
  const combined = [...ownHand, ...partnerHand];
  let count = 0;

  // Trump tricks — just count trump cards for rough estimate
  const trumpCards = combined.filter(c => cardSuit(c) === trump).sort((a, b) => cardRank(b) - cardRank(a));
  // Check if they hold the top N trumps
  const allTrumps = RANKS.map(r => r + trump);
  let consecutive = 0;
  for (const card of allTrumps.reverse()) {
    if (trumpCards.includes(card)) consecutive++;
    else break;
  }
  count += consecutive;

  // Side suit aces
  for (const suit of SUITS.filter(s => s !== trump)) {
    if (combined.includes('A' + suit)) count += 1;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Card selection helpers
// ---------------------------------------------------------------------------

function lowestCard(cards) {
  return cards.reduce((min, c) => cardRank(c) < cardRank(min) ? c : min);
}

function highestCard(cards) {
  return cards.reduce((max, c) => cardRank(c) > cardRank(max) ? c : max);
}

function lowestWinningCard(cards, winnerCard) {
  const winners = cards.filter(c => {
    const cs = cardSuit(c);
    const ws = cardSuit(winnerCard);
    if (cs !== ws) return false; // different suit — can't compare directly without trump context
    return cardRank(c) > cardRank(winnerCard);
  });
  if (winners.length === 0) return null;
  return lowestCard(winners);
}

/**
 * Check if the player holds the highest remaining card in a suit.
 * Returns the card if so, null otherwise.
 */
function highestRemainingInSuit(suit, hand, playedCards) {
  const handInSuit = hand.filter(c => cardSuit(c) === suit);
  if (handInSuit.length === 0) return null;

  const myHighest = highestCard(handInSuit);
  const myHighestRank = cardRank(myHighest);

  // Check if any unplayed card in this suit (not in our hand) is higher
  for (const rank of RANKS) {
    const card = rank + suit;
    if (cardRank(card) > myHighestRank && !playedCards.includes(card) && !hand.includes(card)) {
      return null; // someone else could have a higher card
    }
  }
  return myHighest;
}

/**
 * Get all guaranteed winners from hand — cards that are the highest remaining
 * in their suit and the suit hasn't been trumped by opponents.
 */
function getGuaranteedWinners(hand, trump, playedCards, opponentVoidSuits) {
  const winners = [];
  const seenSuits = new Set();
  for (const card of hand) {
    const suit = cardSuit(card);
    if (seenSuits.has(suit)) continue;
    seenSuits.add(suit);

    // Skip non-trump suits where an opponent is void (they could trump it)
    if (suit !== trump && opponentVoidSuits.some(vs => vs.has(suit))) continue;

    const best = highestRemainingInSuit(suit, hand, playedCards);
    if (best) winners.push(best);
  }
  return winners;
}

/**
 * Check if partner's card is the highest remaining in its suit.
 */
function isPartnerCardHighestRemaining(partnerCard, hand, playedCards) {
  const suit = cardSuit(partnerCard);
  const partnerRank = cardRank(partnerCard);

  for (const rank of RANKS) {
    const card = rank + suit;
    if (cardRank(card) > partnerRank && !playedCards.includes(card) && !hand.includes(card)) {
      return false;
    }
  }
  return true;
}

function currentTrickWinner(currentTrick, trump) {
  if (currentTrick.length === 0) return null;
  const { trickWinner } = require('./gameLogic');
  // Build a fake trick to evaluate the current winner
  if (currentTrick.length === 1) return currentTrick[0].seat;
  return trickWinner(currentTrick, trump);
}

// ---------------------------------------------------------------------------
// AIPlayer
// ---------------------------------------------------------------------------

class AIPlayer {
  constructor(seat, game) {
    this.seat = seat;
    this.game = game;
  }

  async decideAction() {
    const delay = process.env.FAST_TEST ? 10 : 600 + Math.random() * 400;
    await new Promise(r => setTimeout(r, delay));

    const game = this.game;
    const seat = this.seat;

    // Handle pending support request — bot is the partner being asked
    if (game.pendingSupportRequest && game.activeSeat === seat) {
      const asker = game.pendingSupportRequest.asker;
      if ((asker + 2) % 4 === seat) {
        return this._giveSupport(asker);
      }
    }

    switch (game.phase) {
      case 'bidding':
        return this._decideBid(false);
      case 'bidding_forced':
        if (game.activeSeat === seat) {
          return this._decideForcedBid();
        }
        break;
      case 'partner_reveal':
        if (game.biddingSeat === seat) {
          return this._decideIncrease();
        }
        break;
      case 'playing':
        if (game.activeSeat === seat) {
          return this._decidePlay();
        }
        break;
    }
  }

  _giveSupport(askerSeat) {
    const game = this.game;
    const seat = this.seat;
    // Evaluate hand relative to asker's likely trump
    const { suit } = bestSuit(game.hands[askerSeat] || game.hands[seat]);
    const estimate = evaluateHand(game.hands[seat], suit);

    let signal;
    if (estimate >= 4) signal = 'Major';
    else if (estimate >= 1) signal = 'Minor';
    else signal = 'Pass';

    game.giveSupport(seat, signal);
    return { action: 'give_support', signal };
  }

  _decideBid(forced) {
    const game = this.game;
    const seat = this.seat;

    if (game.activeSeat !== seat) return null;

    const hand = game.hands[seat];
    const { suit, estimate } = bestSuit(hand);
    const partnerSeat = (seat + 2) % 4;
    const partnerSignal = game.supportSignals[partnerSeat];

    // Should we ask for support first?
    if (!game.supportAsked[seat] && estimate >= 5 && estimate < 8) {
      game.askSupport(seat);
      return { action: 'ask_support' };
      // After asking, bot will be called again after partner responds
    }

    let shouldBid = false;
    let bidAmount = 10;
    let bidTrump = suit;

    if (estimate >= 10) {
      shouldBid = true;
      bidAmount = Math.min(Math.round(estimate), 13);
    } else if (estimate >= 9 && partnerSignal === 'Minor') {
      shouldBid = true;
      bidAmount = 10;
    } else if (estimate >= 8 && partnerSignal === 'Major') {
      shouldBid = true;
      bidAmount = 10;
    } else if (estimate >= 7 && partnerSignal === 'Major') {
      shouldBid = true;
      bidAmount = 10;
    }

    if (shouldBid) {
      game.placeBid(seat, bidAmount, bidTrump);
      return { action: 'place_bid', bid: bidAmount, trump: bidTrump };
    } else {
      game.passBid(seat);
      return { action: 'pass_bid' };
    }
  }

  _decideForcedBid() {
    const game = this.game;
    const seat = this.seat;

    if (game.activeSeat !== seat) return null;

    const hand = game.hands[seat];
    const { suit, estimate } = bestSuit(hand);
    const partnerSeat = (seat + 2) % 4;

    // Ask for support if not already done
    if (!game.supportAsked[seat]) {
      game.askSupport(seat);
      return { action: 'ask_support' };
    }

    const bidAmount = Math.max(8, Math.min(Math.round(estimate), 13));
    game.placeBid(seat, bidAmount, suit);
    return { action: 'place_bid', bid: bidAmount, trump: suit };
  }

  _decideIncrease() {
    const game = this.game;
    const seat = this.seat;

    if (game.biddingSeat !== seat) return null;

    const partnerSeat = (seat + 2) % 4;
    const ownHand = game.hands[seat];
    const partnerHand = game.hands[partnerSeat];
    const trump = game.trump;

    const combined = countSureTricks(ownHand, partnerHand, trump);
    let newBid = game.bid;

    if (combined > game.bid) {
      newBid = Math.min(Math.round(combined), 13);
      if (newBid > game.bid) {
        game.increaseBid(seat, newBid);
        return { action: 'increase_bid', bid: newBid };
      }
    }

    // Start play
    game.startPlay(seat);
    return { action: 'start_play' };
  }

  _decidePlay() {
    const game = this.game;
    const seat = this.seat;

    if (game.activeSeat !== seat) return null;

    const trump = game.trump;

    // For bid >= 10, bidder controls partner too
    if (game.bid >= 10 && seat === game.biddingSeat) {
      return this._decideBidderPlay();
    }

    const hand = game.hands[seat];
    const playable = getPlayableCards(hand, game.currentTrick);

    // Check TRAM opportunity first
    const tramCards = this._getTramCards(seat);
    if (tramCards) {
      game.callTram(seat, tramCards);
      return { action: 'call_tram', cards: tramCards };
    }

    let card;

    if (game.currentTrick.length === 0) {
      // Leading
      card = this._decideLeadCard(seat, playable);
    } else {
      const ledSuit = cardSuit(game.currentTrick[0].card);
      const isFollowing = playable.some(c => cardSuit(c) === ledSuit);

      if (isFollowing) {
        card = this._decideFollowCard(seat, playable, ledSuit);
      } else {
        // Void in led suit
        card = this._decideVoidCard(seat, playable);
      }
    }

    if (!card) card = lowestCard(playable);

    const result = game.playCard(seat, card);
    if (!result.ok) {
      console.error(`Bot ${seat} play failed: ${result.error}, card=${card}, playable=${playable}`);
      // Fallback: try first playable card
      if (playable.length > 0 && card !== playable[0]) {
        game.playCard(seat, playable[0]);
      }
    }
    return { action: 'play_card', card };
  }

  _decideBidderPlay() {
    const game = this.game;
    const seat = this.seat;
    const partner = (seat + 2) % 4;
    const trump = game.trump;

    // Determine which hand to play from based on trick position
    let playFromSeat;
    if (game.currentTrick.length > 0) {
      const lastPlayed = game.currentTrick[game.currentTrick.length - 1].seat;
      const nextInTrick = (lastPlayed + 1) % 4;
      playFromSeat = (nextInTrick === partner || nextInTrick === seat) ? nextInTrick : seat;
    } else {
      // Leading — the leader is the previous trick winner, or dealer+1 for first trick
      const leader = game.lastTrick ? game.lastTrick.winner : (game.dealer + 1) % 4;
      playFromSeat = (leader === partner) ? partner : seat;
    }

    const hand = game.hands[playFromSeat];
    const playable = getPlayableCards(hand, game.currentTrick);
    if (playable.length === 0) return null;

    // Check TRAM with both hands
    const tramCards = this._getTramCardsBidder();
    if (tramCards) {
      game.callTram(seat, tramCards);
      return { action: 'call_tram', cards: tramCards };
    }

    let card;
    if (game.currentTrick.length === 0) {
      card = this._decideLeadCard(playFromSeat, playable);
    } else {
      const ledSuit = cardSuit(game.currentTrick[0].card);
      const isFollowing = playable.some(c => cardSuit(c) === ledSuit);
      if (isFollowing) {
        card = this._decideFollowCard(playFromSeat, playable, ledSuit);
      } else {
        card = this._decideVoidCard(playFromSeat, playable);
      }
    }

    if (!card) card = lowestCard(playable);

    const result = game.playCard(seat, card);
    if (!result.ok) {
      console.error(`Bot ${seat} bidder play failed: ${result.error}, card=${card}, from seat ${playFromSeat}`);
      if (playable.length > 0 && card !== playable[0]) {
        game.playCard(seat, playable[0]);
      }
    }
    return { action: 'play_card', card };
  }

  _decideLeadCard(seat, playable) {
    const game = this.game;
    const trump = game.trump;
    const callerTeam = seat % 2;
    const isBidding = callerTeam === game.biddingTeam;
    const partnerSeat = (seat + 2) % 4;
    const opponents = [0, 1, 2, 3].filter(s => s % 2 !== callerTeam);
    const opponentVoidSuits = opponents.map(s => game.voidSuits[s]);
    const partnerVoidSuits = game.voidSuits[partnerSeat];

    const bidTeamTricks = game.tricks[game.biddingTeam === 0 ? 0 : 1] +
      game.tricks[game.biddingTeam === 0 ? 2 : 3];
    const defTeamTricks = game.tricks[game.biddingTeam === 0 ? 1 : 0] +
      game.tricks[game.biddingTeam === 0 ? 3 : 2];

    const belowTarget = isBidding
      ? bidTeamTricks < game.bid
      : defTeamTricks < (14 - game.bid);

    if (belowTarget) {
      // 1. Lead guaranteed winners (highest remaining in suit, safe from trumping)
      const winners = getGuaranteedWinners(playable, trump, game.playedCards, opponentVoidSuits);
      if (winners.length > 0) return winners[0];

      // 2. Lead low cards in suits partner has trumped (but opponents haven't)
      const partnerTrumpedSuits = [...partnerVoidSuits].filter(
        suit => suit !== trump && !opponentVoidSuits.some(vs => vs.has(suit))
      );
      if (partnerTrumpedSuits.length > 0) {
        const feedCards = playable.filter(c =>
          partnerTrumpedSuits.includes(cardSuit(c)) && cardSuit(c) !== trump
        );
        if (feedCards.length > 0) return lowestCard(feedCards);
      }

      // 3. Lead short suits to create voids
      const suitCounts = {};
      for (const suit of SUITS) {
        suitCounts[suit] = playable.filter(c => cardSuit(c) === suit).length;
      }
      const shortSuits = SUITS.filter(s => s !== trump && suitCounts[s] === 1);
      if (shortSuits.length > 0) {
        const shortCards = playable.filter(c => cardSuit(c) === shortSuits[0]);
        if (shortCards.length > 0) return shortCards[0];
      }

      // 4. Lead high trump
      const trumpCards = playable.filter(c => cardSuit(c) === trump);
      if (trumpCards.some(c => c.startsWith('A') || c.startsWith('K'))) {
        return highestCard(trumpCards);
      }
    }

    // Defending — lead trump to deplete bidder, but avoid suits opponents are void in
    if (!isBidding) {
      const trumpCards = playable.filter(c => cardSuit(c) === trump);
      if (trumpCards.length > 0) return lowestCard(trumpCards);

      // Lead suits where opponents are void (they can't follow) — partner might win
      const feedPartner = playable.filter(c => {
        const s = cardSuit(c);
        return s !== trump && partnerVoidSuits.has(s) && !opponentVoidSuits.some(vs => vs.has(s));
      });
      if (feedPartner.length > 0) return lowestCard(feedPartner);
    }

    // Default: lead lowest non-trump, or lowest trump if spade-tight
    const nonTrump = playable.filter(c => cardSuit(c) !== trump);
    return nonTrump.length > 0 ? lowestCard(nonTrump) : lowestCard(playable);
  }

  _decideFollowCard(seat, playable, ledSuit) {
    const game = this.game;
    const trump = game.trump;

    const currentWinnerSeat = currentTrickWinner(game.currentTrick, trump);
    const partnerSeat = (seat + 2) % 4;
    const partnerWinning = currentWinnerSeat === partnerSeat;

    const suitCards = playable.filter(c => cardSuit(c) === ledSuit);
    const currentWinnerCard = game.currentTrick.find(p => p.seat === currentWinnerSeat)?.card;
    const cardsInTrick = game.currentTrick.length;
    const isLastToPlay = cardsInTrick === 3;

    if (partnerWinning) {
      if (isLastToPlay) {
        // Partner winning and we're last — play lowest safely
        return lowestCard(suitCards.length > 0 ? suitCards : playable);
      }

      // Partner winning but opponent(s) still play after us — check if partner's card is safe
      const partnerCard = game.currentTrick.find(p => p.seat === partnerSeat)?.card;
      if (partnerCard && !isPartnerCardHighestRemaining(partnerCard, playable, game.playedCards)) {
        // Partner's card could be beaten — try to play over with a guaranteed winner
        if (suitCards.length > 0) {
          const myBest = highestRemainingInSuit(ledSuit, playable, game.playedCards);
          if (myBest) return myBest;
          // Otherwise play lowest over partner if possible
          const overPartner = suitCards.filter(c => cardRank(c) > cardRank(partnerCard));
          if (overPartner.length > 0) return lowestCard(overPartner);
        }
      }

      // Partner seems safe — play lowest
      return lowestCard(suitCards.length > 0 ? suitCards : playable);
    }

    // Opponent winning — try to win
    if (currentWinnerCard && suitCards.length > 0) {
      if (isLastToPlay) {
        // Last to play — just need to beat the current winner with minimum
        const winning = suitCards.filter(c => cardRank(c) > cardRank(currentWinnerCard));
        if (winning.length > 0) return lowestCard(winning);
      } else {
        // Not last — prefer a guaranteed winner to avoid being overtaken
        const myBest = highestRemainingInSuit(ledSuit, playable, game.playedCards);
        if (myBest && cardRank(myBest) > cardRank(currentWinnerCard)) return myBest;
        // Fall back to lowest winning card
        const winning = suitCards.filter(c => cardRank(c) > cardRank(currentWinnerCard));
        if (winning.length > 0) return lowestCard(winning);
      }
    }

    return lowestCard(suitCards.length > 0 ? suitCards : playable);
  }

  _decideVoidCard(seat, playable) {
    const game = this.game;
    const trump = game.trump;

    const currentWinnerSeat = currentTrickWinner(game.currentTrick, trump);
    const partnerSeat = (seat + 2) % 4;
    const partnerWinning = currentWinnerSeat === partnerSeat;
    const isLastToPlay = game.currentTrick.length === 3;

    const trumpCards = playable.filter(c => cardSuit(c) === trump);
    const nonTrump = playable.filter(c => cardSuit(c) !== trump);

    if (partnerWinning && isLastToPlay) {
      // Partner winning and no threats remain — sluff strategically
      return this._bestSluff(nonTrump, trumpCards, playable);
    }

    if (partnerWinning && !isLastToPlay) {
      // Partner winning but opponent plays after — check if partner is safe
      const partnerCard = game.currentTrick.find(p => p.seat === partnerSeat)?.card;
      if (partnerCard) {
        const opponents = [0, 1, 2, 3].filter(s => s % 2 !== seat % 2);
        const opponentsMayTrump = opponents.some(s =>
          !game.currentTrick.some(p => p.seat === s) && // hasn't played yet
          game.voidSuits[s].has(cardSuit(game.currentTrick[0].card)) // void in led suit
        );
        if (opponentsMayTrump && trumpCards.length > 0) {
          // Opponent might trump partner — we should trump higher to protect
          return lowestCard(trumpCards);
        }
      }
      return this._bestSluff(nonTrump, trumpCards, playable);
    }

    // Opponent winning — try to trump
    if (trumpCards.length > 0) {
      const currentWinnerCard = game.currentTrick.find(p => p.seat === currentWinnerSeat)?.card;
      const winnerIsTrump = currentWinnerCard && cardSuit(currentWinnerCard) === trump;
      if (winnerIsTrump) {
        // Need to over-trump
        const overTrumps = trumpCards.filter(c => cardRank(c) > cardRank(currentWinnerCard));
        if (overTrumps.length > 0) return lowestCard(overTrumps);
        // Can't over-trump — sluff instead of wasting trump
        return this._bestSluff(nonTrump, [], playable);
      }
      return lowestCard(trumpCards);
    }

    // No trump — sluff
    return this._bestSluff(nonTrump, trumpCards, playable);
  }

  /** Pick the best card to discard — prefer low cards from suits where we hold no winners. */
  _bestSluff(nonTrump, trumpCards, playable) {
    if (nonTrump.length > 0) {
      // Prefer discarding from suits where we don't hold the highest remaining
      const game = this.game;
      const losers = nonTrump.filter(c =>
        !highestRemainingInSuit(cardSuit(c), playable, game.playedCards)
      );
      if (losers.length > 0) return lowestCard(losers);
      return lowestCard(nonTrump);
    }
    return lowestCard(trumpCards.length > 0 ? trumpCards : playable);
  }

  _getTramCards(seat) {
    const game = this.game;
    const trump = game.trump;
    const hand = game.hands[seat];
    const callerTeam = seat % 2;

    // How many tricks does this team still need?
    const bidTeamTricks = game.tricks[game.biddingTeam === 0 ? 0 : 1] +
      game.tricks[game.biddingTeam === 0 ? 2 : 3];
    const defTeamTricks = game.tricks[game.biddingTeam === 0 ? 1 : 0] +
      game.tricks[game.biddingTeam === 0 ? 3 : 2];

    const needed = callerTeam === game.biddingTeam
      ? game.bid - bidTeamTricks
      : (14 - game.bid) - defTeamTricks;

    if (needed <= 0) return null;
    if (hand.length < needed) return null;

    const opponents = [0, 1, 2, 3].filter(s => s % 2 !== callerTeam);

    // Check if all remaining cards in hand are provably winning
    const allOpponentCards = opponents.flatMap(s => game.hands[s]);

    // Simple check: if we have all remaining trump and all remaining aces
    // Order cards: trump first (high), then aces, then others
    const sorted = [...hand].sort((a, b) => {
      const aT = cardSuit(a) === trump;
      const bT = cardSuit(b) === trump;
      if (aT && !bT) return -1;
      if (!aT && bT) return 1;
      return cardRank(b) - cardRank(a);
    });

    // Verify each of the needed cards can't be beaten
    const tramCards = sorted.slice(0, needed);

    for (const card of tramCards) {
      const suit = cardSuit(card);
      const rank = cardRank(card);

      // Check if any opponent can beat this card
      for (const oppSeat of opponents) {
        const oppHand = game.hands[oppSeat];
        const oppSuitCards = oppHand.filter(c => cardSuit(c) === suit);

        if (oppSuitCards.length > 0) {
          if (oppSuitCards.some(c => cardRank(c) > rank)) return null; // can be beaten
        } else if (suit !== trump) {
          // Opponent void in suit — can they trump?
          const oppTrump = oppHand.filter(c => cardSuit(c) === trump);
          if (oppTrump.length > 0) return null; // can be trumped
        }
      }
    }

    return tramCards;
  }

  _getTramCardsBidder() {
    const game = this.game;
    const seat = this.seat;
    const partner = (seat + 2) % 4;
    const trump = game.trump;
    const callerTeam = seat % 2;

    const bidTeamTricks = game.tricks[game.biddingTeam === 0 ? 0 : 1] +
      game.tricks[game.biddingTeam === 0 ? 2 : 3];
    const defTeamTricks = game.tricks[game.biddingTeam === 0 ? 1 : 0] +
      game.tricks[game.biddingTeam === 0 ? 3 : 2];

    const needed = callerTeam === game.biddingTeam
      ? game.bid - bidTeamTricks
      : (14 - game.bid) - defTeamTricks;

    if (needed <= 0) return null;

    const combinedHand = [...game.hands[seat], ...game.hands[partner]];
    if (combinedHand.length < needed) return null;

    const opponents = [0, 1, 2, 3].filter(s => s % 2 !== callerTeam);

    const sorted = [...combinedHand].sort((a, b) => {
      const aT = cardSuit(a) === trump;
      const bT = cardSuit(b) === trump;
      if (aT && !bT) return -1;
      if (!aT && bT) return 1;
      return cardRank(b) - cardRank(a);
    });

    const tramCards = sorted.slice(0, needed);

    for (const card of tramCards) {
      const suit = cardSuit(card);
      const rank = cardRank(card);
      for (const oppSeat of opponents) {
        const oppHand = game.hands[oppSeat];
        const oppSuitCards = oppHand.filter(c => cardSuit(c) === suit);
        if (oppSuitCards.length > 0) {
          if (oppSuitCards.some(c => cardRank(c) > rank)) return null;
        } else if (suit !== trump) {
          const oppTrump = oppHand.filter(c => cardSuit(c) === trump);
          if (oppTrump.length > 0) return null;
        }
      }
    }

    return tramCards;
  }
}

module.exports = { AIPlayer };
