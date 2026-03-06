# TODO

## 2. Issue Reporting
- Add an "Issue" button in the game UI
- On click, capture:
  - All current game state variables/context
  - Screenshot of the current screen
  - Detailed user-written summary of the problem
  - should include the location of each card seperately
- Store the report on GitHub Issues or a local database (details TBD)

## 5. Admin Dashboard
- Real-time view of active games and player counts
- Traffic and usage stats
- Consider Google Analytics integration for visitor/session metrics

## 6. Deployment on surri.xuresolutions.in
- make sure the UI works and BE works
- make sure github actions are set up to deploy to surri.xuresolutions.in
- any changes pushed to master, should auto deploy to surri.xuresolutions.in
- if there are players playing, show a notice that site will be down for maintenance in 5 minutes and do the changes then

## 7. Can we make it P2P? (deferred)
- peer to peer connection between clients
- host client will be the source of truth