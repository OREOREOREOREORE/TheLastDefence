import { socket } from './socket';
import './control';

import { Sprite } from '../engine/sprite';
import { Application } from '../engine/application';

import playerSpriteSheet from '../../asset/player_sprite.png';

import type { GameState } from '../common/game-state';

const PLAYER_SETTINGS = {
  src: playerSpriteSheet,
  spriteWidth: 24,
  spriteHeight: 25,
  scale: 2,
  sequences: {
    moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
  },
};

export function initializeGame() {
  const app = new Application({
    rootElementSelector: '#app',
    width: 800,
    height: 600,
    background: '#f0f0f0',
    fps: 60,
  });

  const playerA = new Sprite(PLAYER_SETTINGS);
  const playerB = new Sprite(PLAYER_SETTINGS);

  app.registerSprite('playerA', playerA);
  app.registerSprite('playerB', playerB);

  playerA.setSequence('moveLeft');
  playerB.setSequence('moveLeft');

  playerA.canvasX = 100;
  playerA.canvasY = 100;

  playerB.canvasX = 100;
  playerB.canvasY = 200;

  socket.on('gameStateUpdate', (newState: GameState) => {
    playerA.canvasX = newState.playerA.x;
    playerA.canvasY = newState.playerA.y;

    playerB.canvasX = newState.playerB.x;
    playerB.canvasY = newState.playerB.y;
  });

  app.initialize();
}
