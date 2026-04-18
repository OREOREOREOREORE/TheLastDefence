import { io } from 'socket.io-client';
import { Application } from '../engine/application';
import { Sprite } from '../engine/sprite';

import playerSpriteSheet from '../../asset/player_sprite.png';

document.addEventListener('DOMContentLoaded', () => {
  io();

  const app = new Application({
    rootElementSelector: '#app',
    width: 800,
    height: 600,
    background: '#f0f0f0',
    fps: 30,
  });

  const player = new Sprite({
    src: playerSpriteSheet,
    spriteWidth: 24,
    spriteHeight: 25,
    scale: 2,
    sequences: {
      moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
    },
  });
  const player2 = new Sprite({
    src: playerSpriteSheet,
    spriteWidth: 24,
    spriteHeight: 25,
    scale: 2,
    sequences: {
      moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
    },
  });
  app.registerSprite('player', player);
  app.registerSprite('player2', player2);

  player.setSequence('moveLeft');
  player2.setSequence('moveLeft');

  player.canvasX = 100;
  player.canvasY = 100;
  player.setDebug(true);

  player2.canvasX = 150;
  player2.canvasY = 150;
  player2.setDebug(true);

  player.rotation = Math.PI;
  player2.rotation = Math.PI;

  app.addEventListener('click', (event) => {
    const clickEvent = event as CustomEvent<{ x: number; y: number }>;
    player.canvasX = clickEvent.detail.x;
    player.canvasY = clickEvent.detail.y;
  });

  app.onTick((time) => {
    player.rotation += 0.001 * time.delta;
    player2.rotation += 0.001 * time.delta;
    console.log(player.collidesWith(player2));
  });

  app.initialize();
});
