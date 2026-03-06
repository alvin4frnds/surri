import { io } from 'socket.io-client';
const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;
export const socket = io(SERVER_URL);

// Expose for debugging/testing
window.__socket = socket;
