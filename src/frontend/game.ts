import { socket } from './socket';
import './control';

import { Sprite } from '../engine/sprite';
import { Application } from '../engine/application';
import { Circle } from '../engine/circle';

import $ from 'jquery';

import playerSpriteSheet from '../../asset/player_sprite.png';
import backgroundImage from '../../asset/game-background.png';

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
    rootElementSelector: '#game-container',
    width: 1400,
    height: 630,
    background: `url(${backgroundImage}) no-repeat center/105%`,
    fps: 60,
  });

  const playerA = new Sprite(PLAYER_SETTINGS);
  const playerB = new Sprite(PLAYER_SETTINGS);

  const clip = new Circle(100, 100, 100);
  clip.setMode('clip');
  app.registerObject('clip', clip);

  app.registerObject('playerA', playerA);
  app.registerObject('playerB', playerB);

  playerA.setSequence('moveLeft');
  playerB.setSequence('moveLeft');

  playerA.canvasX = 100;
  playerA.canvasY = 100;

  playerB.canvasX = 100;
  playerB.canvasY = 200;

  $(document).on('mousemove', (event) => {
    const canvasRect = app.getCanvasRect();
    if (!canvasRect) return;

    console.log('Mouse move:', event.clientX, event.clientY);

    const canvasX = event.clientX - canvasRect.left;
    const canvasY = event.clientY - canvasRect.top;

    clip.canvasX = canvasX;
    clip.canvasY = canvasY;
  });

  socket.on('gameStateUpdate', (newState: GameState) => {
    playerA.canvasX = newState.playerA.x;
    playerA.canvasY = newState.playerA.y;

    playerB.canvasX = newState.playerB.x;
    playerB.canvasY = newState.playerB.y;
  });

  app.initialize();
}
