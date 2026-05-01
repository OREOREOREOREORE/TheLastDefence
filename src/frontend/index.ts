import $ from 'jquery';
import { initializeUI } from './ui';
import sounds from './music';

import backgroundMusic from '../../asset/sounds/Gold_Coin_Sprint.mp3';

await Promise.all([sounds.load('bg', backgroundMusic)]);

$(() => {
  initializeUI();
  sounds.playBgm('bg', 0.1);
  // import('./game')
  //   .then(({ initializeGame }) => {
  //     initializeGame();
  //   })
  //   .catch((error: unknown) => {
  //     console.error('Error loading game module:', error);
  //   });

  // const app = new Application({
  //   rootElementSelector: '#app',
  //   width: 800,
  //   height: 600,
  //   background: '#f0f0f0',
  //   fps: 120,
  // });

  // const background = new Application({
  //   rootElementSelector: '#background',
  //   width: 1600, // 1200, 800
  //   height: 1100,
  //   background: `url(${backgroundImage}) no-repeat center`,
  // });

  // const gameRoom = new Application({
  //   rootElementSelector: '#game-room',
  //   width: 1600,
  //   height: 1100,
  //   background: `url(${gameRoomImage}) no-repeat center`,
  // });

  // const player = new Sprite({
  //   src: playerSpriteSheet,
  //   spriteWidth: 24,
  //   spriteHeight: 25,
  //   scale: 2,
  //   sequences: {
  //     moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
  //   },
  // });
  // const player2 = new Sprite({
  //   src: playerSpriteSheet,
  //   spriteWidth: 24,
  //   spriteHeight: 25,
  //   scale: 2,
  //   sequences: {
  //     moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
  //   },
  // });
  // app.registerSprite('player', player);
  // app.registerSprite('player2', player2);

  // player.setSequence('moveLeft');
  // player2.setSequence('moveLeft');

  // player.canvasX = 100;
  // player.canvasY = 100;
  // player.setDebug(true);

  // player2.canvasX = 100;
  // player2.canvasY = 200;
  // player2.setDebug(true);

  // player.rotation = Math.PI;
  // player2.rotation = Math.PI;

  // socket.on('gameStateUpdate', (newState) => {
  //   player.canvasX = newState.playerA.x;
  //   player.canvasY = newState.playerA.y;

  //   player2.canvasX = newState.playerB.x;
  //   player2.canvasY = newState.playerB.y;
  // });

  // app.addEventListener('click', (event) => {
  //   const clickEvent = event as CustomEvent<{ x: number; y: number }>;
  //   player.canvasX = clickEvent.detail.x;
  //   player.canvasY = clickEvent.detail.y;
  // });

  // app.onTick((time) => {
  //   // player.rotation += 0.001 * time.delta;
  //   // player2.rotation += 0.001 * time.delta;
  //   console.log(player2.canvasX);
  // });

  // app.initialize();
  // background.initialize();
  // gameRoom.initialize();
});
