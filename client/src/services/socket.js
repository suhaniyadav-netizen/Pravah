/**
 * Pravah V2 — Real-Time Socket.IO Telemetry Service
 */

import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    const defaultSocketUrl =
      typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        ? 'https://pravah-br0g.onrender.com'
        : typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:5000';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
}

export function subscribeToTelemetry(event, callback) {
  const socket = getSocket();
  socket.on(event, callback);
  return () => socket.off(event, callback);
}
