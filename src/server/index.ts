import express from 'express';
import ViteExpress from 'vite-express';

import { Server } from 'socket.io';
import { createServer } from 'node:http';

import process from 'node:process';

const app = express();
const httpServer = createServer(app);
const websocketServer = new Server(httpServer);

ViteExpress.config({
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
});

app.get('/message', (_, res) => res.send('Hello from express!'));

websocketServer.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

await ViteExpress.bind(app, httpServer);
httpServer.listen(8000, () => {
  console.log('Server is running on http://localhost:8000');
});
