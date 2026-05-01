import express from 'express';
import ViteExpress from 'vite-express';
import fs from 'node:fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';

import process from 'node:process';
import type { Request } from 'express';

import { Server } from 'socket.io';
import { createServer } from 'node:http';

import {
  addNewGameState,
  decrementX,
  decrementY,
  incrementX,
  incrementY,
  addWeapon,
  removeWeapon,
} from './game-state.ts';
import type {
  AddWeaponRequestMessage,
  GameStateUpdateRequestMessage,
  RemoveWeaponRequestMessage,
} from '../common/game-state.ts';
import {
  rooms,
  bothReady,
  findOrCreateRoom,
  leaveRoom,
  setReady,
  startGame,
} from './game-room.ts';

import type { Room } from '../common/game-room.d.ts';

interface Cookies {
  auth_token?: string;
}

interface LoginRequestBody {
  success?: boolean;
  error?: string;
  user?: {
    username: string;
  };
}

type LoginRequest = Request<
  Record<string, unknown>,
  LoginRequestBody,
  {
    username: string;
    password: string;
  }
>;

type User = Record<string, { password: string }>;

const app = express();
const httpServer = createServer(app);
const websocketServer = new Server(httpServer);

app.use(express.static('frontend'));
app.use(express.json());
app.use(cookieParser());

const secretKey = crypto.randomBytes(48).toString('hex');

ViteExpress.config({
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
});

app.get('/message', (_, res) => res.send('Hello from express!'));

websocketServer.on('connection', (socket) => {
  const username = (socket.handshake.auth as { username?: string }).username;
  if (!username) {
    console.log('Rejecting connection without username:', socket.id);
    socket.disconnect();
    return;
  }
  console.log('A client connected:', socket.id, username);
  const player = { socketId: socket.id, username, ready: false };
  socket.on('start', async (_, callback: (room: Room) => void) => {
    const room = findOrCreateRoom(player);
    const roomIdStr = room.roomId.toString();
    console.log('Player', username, 'is trying to join room', roomIdStr);
    await socket.join(roomIdStr);

    websocketServer.to(roomIdStr).emit('roomUpdate', room);

    console.log(
      'joined room',
      roomIdStr,
      'players:',
      room.players.map((p) => p.username),
    );
    // socket.emit('roomJoined', roomIdStr);
    callback(room);
  });

  // if (room.status === "full"){
  //   websocketServer.to(roomIdStr).emit('roomFull', {
  //     roomId: room.roomId,
  //     players: [room.players[0]?.username, room.players[1]?.username],
  //   });
  // }else{
  //   socket.emit('waiting', {roomId: room.roomId});
  // }

  socket.on('ready', (roomId: string) => {
    const room = setReady(parseInt(roomId, 10), username);
    console.log(`Player ${username} is ready in room ${roomId}`);
    if (!room) return;

    websocketServer.to(roomId).emit('roomUpdate', room);

    if (bothReady(room)) {
      startGame(parseInt(roomId, 10));
      addNewGameState(roomId, {
        player1: { x: 100, y: 100, health: 100 },
        player2: { x: 100, y: 200, health: 100 },
        weapons: [],
      });
      websocketServer.to(roomId).emit('gameStart');
    }
    // console.log('Current rooms:', room);
  });

  socket.on('leaveRoom', async (roomId: string, callback: () => void) => {
    leaveRoom(parseInt(roomId, 10), username);
    await socket.leave(roomId);

    const room = rooms.get(parseInt(roomId, 10));
    if (room) {
      websocketServer.to(roomId).emit('roomUpdate', room);
    }

    callback();
  });

  socket.on('incrementX', (data: GameStateUpdateRequestMessage) => {
    const newState = incrementX(data.roomId, data.player);
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('incrementY', (data: GameStateUpdateRequestMessage) => {
    const newState = incrementY(data.roomId, data.player);
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('decrementX', (data: GameStateUpdateRequestMessage) => {
    const newState = decrementX(data.roomId, data.player);
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('decrementY', (data: GameStateUpdateRequestMessage) => {
    const newState = decrementY(data.roomId, data.player);
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('addWeapon', (data: AddWeaponRequestMessage) => {
    const newState = addWeapon(
      data.roomId,
      data.player,
      data.weaponId,
      data.rotation,
      data.createdAt,
      data.directionNormVector,
    );
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('removeWeapon', (data: RemoveWeaponRequestMessage) => {
    const newState = removeWeapon(data.roomId, data.weaponId);
    websocketServer.to(data.roomId).emit('gameStateUpdate', newState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id, username);
    for (const room of rooms.values()) {
      if (room.players.some((p) => p.socketId === socket.id)) {
        console.log(
          `Player ${username} was in room ${room.roomId}, processing leaveRoom...`,
        );
        leaveRoom(room.roomId, username);
      }
    }
    // Grace period so a refresh/reconnect by the same username keeps the room.
    // setTimeout(() => {
    //   const current = findRoomByUsername(username);
    //   if (current?.roomId === room.roomId){
    //     const slot =
    //       current.player1?.username === username ? current.player1 :
    //       current.player2?.username === username ? current.player2 : undefined;
    //     if (slot && slot.socketId !== socket.id) return; // reconnected
    //   }
    // }, 3000);
  });
});

/*Login System*/

function containWordCharsOnly(text: string) {
  return /^\w+$/.test(text);
}

app.post('/login', async (req: LoginRequest, res) => {
  const { username, password } = req.body;

  const users = JSON.parse(
    fs.readFileSync('data/users.json', 'utf-8'),
  ) as Record<string, { password: string }>;

  if (!(username in users)) {
    res.json({ error: 'username not registered' });
    return;
  }

  const user = users[username];

  const verified = await argon2.verify(user.password, password);

  if (verified) {
    const token = jwt.sign({ name: username }, secretKey, { expiresIn: '5m' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, //true
      maxAge: 300000,
    });
    return res.json({ success: true, user: { username } });
  }
  res.json({ error: 'incorrect password or username' });
  // console.log(typeof users);
});

app.get('/validate', (req, res) => {
  const token = (req.cookies as Cookies).auth_token;
  if (!token) {
    res.json({ error: 'cookie expired!' });
    return;
  }

  try {
    const verified = jwt.verify(token, secretKey) as { name: string };
    res.json({ success: true, user: { username: verified.name } });
  } catch {
    res.json({ error: 'Invalid or expired token' });
  }
});

app.get('/signout', (_, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.post('/register', async (req: LoginRequest, res) => {
  const { username, password } = req.body;

  const users = JSON.parse(fs.readFileSync('data/users.json', 'utf-8')) as User;
  // console.log(req.body);
  // console.log(users);
  // console.log(username, password)

  if (!username || !password) {
    res.json({ error: 'Username/password cannot be empty.' });
    return;
  }
  if (!containWordCharsOnly(username)) {
    res.json({
      error: 'username can only contain underscores, letters or numbers.',
    });
    return;
  }
  if (username in users) {
    res.json({ error: 'username has already been used.' });
    return;
  }

  const hashed = await argon2.hash(password);

  users[username] = {
    password: hashed,
  };

  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));

  res.json({ success: true });
});

await ViteExpress.bind(app, httpServer);
httpServer.listen(8000, () => {
  console.log('Server is running on http://localhost:8000');
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');

  websocketServer.disconnectSockets();

  websocketServer
    .close()
    .then(() => {
      httpServer.close();
    })
    .catch((error: unknown) => {
      console.error('Error closing server:', error);
    });
});
