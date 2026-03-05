# Flow
1. Team creation and participation
2. Cutting the deck (optional)
3. Sees 13 cards, user turn to either pass or fail, scenarios can be as follows
    first goes around asking pass / fail
    if pass goes to next person
    that person can also pass, if he have to bid he have to bid >= 10
    can get a hint from parter if he wants to support, he will ask for support after seeing his own cards
        partner will respond with following options 'minor', 'mojor', 'pass'
    if no one bids >= 10, then it goes to first person and he have to say a suit bidding 8
    bidding person will choose the trump for this round.

4. if bid is >= 10, person who bid will see his partner's cards, and basically will be able to select card from his partner's hand to be played in the game
5. Rule of TRAM should be here, meaning i can claim that all remaining cards are mine and i will play them one by one, and if i lose even 1 trick, it will all go to other team.
6. same rules as spades on how it will be played
7. only 1 team will bid, other team will play to counter that bid, 
    for eg: total 13 tricks are there, if team bids 8, other team will try to take at least 6 tricks, 
    same goes if team a bids 10 other team will try to take at least 4 tricks,
8. as soon as team has made his bid, we can conclude that round.
9. for how the pointing work, lets assume there are 2 teams team A (player A and C) and team B (player B and D). only dealer and dealers team will have score, and score have to be +ve
    lets say team A is dealer and player B has to give trump. team A score is 20
        if team B, bid 8 tricks and
            made the bid: team A score += 8
            didn't made the bid: team A score -= 16 (2x penalty for not making the bid)
        if team A, bid 10 tricks
            made the bid: team A score -= 10
            didn't made the bid: team A score += 20
10. As soon as score is >= 52, player is considered lost, score gets reset to 0 and dealer is now the partner of dealer. if score ever gets negative for eg: score = 3 for team and team A bid 10 and new score is -7, dealer will be the next player clockwise and new score will be 7.
10.  there is a special case if someone bids 13. in that case, it is bound to be that dealer will change,
    if team A made the bid of 13 and was dealing
        if team completed the bid: next person anti-clockwise will deal
        if didn't, partner will deal
    if team is dealing, and team B made the 13 bid
        if won the round with 13 tricks: partner will deal
        if not: counter clockwise next person will bid.
11. the game runs indefinitely, just keep a counter on how many times one player has lost. if 3 players lost and the 1 remaining will be considered winner.

# Views I have in mind
1. Team choosing and joining room
2. where a player can see his cards, and bids >= 10 if he is choosing first or pass button to go to next player. and >= 8 if he choosing 2nd time applicable to person next to dealer only.
3. Where player can see his partner's cards and increase the bid or start button.
4. player can see their cards, cards of the round, and can choose a card to play
    ( should be valid by spades rules)
5. player can also see partners card, and can choose on his turn what to play
6. 

# Quality of life features, 
1. for first dealing, take a sorted deck of card and do a realistic 15 cut shuffling and deal to players
    for every other subsequenct shuffling, take cards that everybody has won clockwise and do 5 cut shuffle
2. 