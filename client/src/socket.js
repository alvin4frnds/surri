import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);

function getOrCreatePlayerId() {
  let id = localStorage.getItem('surri_playerId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('surri_playerId', id);
  }
  return id;
}

const playerId = getOrCreatePlayerId();

export const socket = io(SERVER_URL, {
  auth: { playerId }
});

export { playerId };

// Expose for debugging/testing
window.__socket = socket;
