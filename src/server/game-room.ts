import type { Player, Room } from './../common/game-room.d.ts';

const rooms = new Map<number, Room>();
const usernameToRoomId = new Map<string, number>();
let currentRoomId = 0;

function findRoomByUsername(username: string): Room | null {
  const id = usernameToRoomId.get(username);
  if (id === undefined) return null;
  return rooms.get(id) ?? null;
}

function createRoom(roomId: number, player: Player): Room {
  const room: Room = {
    roomId,
    players: [player],
    status: 'waiting',
  };
  rooms.set(roomId, room);
  usernameToRoomId.set(player.username, roomId);
  return room;
}

function joinRoom(roomId: number, player: Player): Room {
  const room = rooms.get(roomId);

  if (!room) {
    throw new Error(`Unexpected Room ID ${roomId}`);
  }

  room.players.push(player);
  room.status = 'full';
  usernameToRoomId.set(player.username, roomId);
  return room;
}

function startGame(roomId: number): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.status !== 'full') return null;
  room.status = 'playing';
  return room;
}

function findOrCreateRoom(player: Player): Room {
  for (const room of rooms.values()) {
    if (room.status === 'waiting') {
      return joinRoom(room.roomId, player);
    }
  }

  const newRoomId = currentRoomId++;
  return createRoom(newRoomId, player);
}

function setReady(roomId: number, username: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  for (const player of room.players) {
    if (player.username === username) {
      player.ready = true;
      break;
    }
  }

  return room;
}

// Check if both players in the room are ready
function bothReady(room: Room): boolean {
  return (
    room.players.length === 2 && room.players.every((player) => player.ready)
  );
}

function leaveRoom(roomId: number, username: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // If the game is in progress, end it: drop the room entirely.
  if (room.status === 'playing') {
    if (room.players[0]) {
      usernameToRoomId.delete(room.players[0].username);
    }
    if (room.players[1]) {
      usernameToRoomId.delete(room.players[1].username);
    }
    rooms.delete(roomId);

    return;
  }

  for (const player of room.players) {
    if (player.username === username) {
      usernameToRoomId.delete(player.username);
    }
  }

  room.players = room.players.filter((p) => p.username !== username);
  // Only one or zero players remain, so the room is now in waiting status.
  room.status = 'waiting';

  if (room.players.length === 0) {
    // status === "waiting" and the room is now empty
    rooms.delete(roomId);
  }
}

export {
  rooms,
  findOrCreateRoom,
  findRoomByUsername,
  setReady,
  bothReady,
  startGame,
  leaveRoom,
};
