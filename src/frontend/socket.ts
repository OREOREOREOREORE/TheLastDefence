import { io } from 'socket.io-client';

export const socket = io({ autoConnect: false });

export function connectSocket(username: string) {
  socket.auth = { username };
  if (!socket.connected) socket.disconnect();
  socket.connect();
}
