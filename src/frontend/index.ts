import $ from 'jquery';
import { setupLogin, Authentication } from './login';
import { Application } from '../engine/application';

import backgroundImage from '../../asset/background.png';

$(() => {
  setupLogin();
  import('./game')
    .then(({ initializeGame }) => {
      initializeGame();
    })
    .catch((error: unknown) => {
      console.error('Error loading game module:', error);
    });

  // const app = new Application({
  //   rootElementSelector: '#app',
  //   width: 800,
  //   height: 600,
  //   background: '#f0f0f0',
  //   fps: 120,
  // });

  const background = new Application({
    rootElementSelector: '#background',
    width: 1600, // 1200, 800
    height: 1100,
    background: `url(${backgroundImage}) no-repeat center`,
  });

  Authentication.validate(
    () => {
      $('.container_form').hide();
      console.log('Welcome back', Authentication.getUser()?.username);
    },

    () => {
      $('.container_form').show();
      console.log('validate failed');
    },
  );

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
  background.initialize();
});
