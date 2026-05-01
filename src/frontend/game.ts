import { socket } from './socket';
import { initializeControl } from './control';

import { Sprite } from '../engine/sprite';
import { Application } from '../engine/application';
// import { Circle } from '../engine/circle';

import $ from 'jquery';

import playerSpriteSheet from '../../asset/player_sprite.png';
import weaponSpriteSheet from '../../asset/arrow.png';
import backgroundImage from '../../asset/game-background.png';

import sounds from './music';

import type { GameState, PlayerId, WeaponState } from '../common/game-state';

const PLAYER_SETTINGS = {
  src: playerSpriteSheet,
  spriteWidth: 24,
  spriteHeight: 25,
  scale: 2,
  sequences: {
    moveLeft: { row: 4, fps: 10, numberOfFrames: 10, loop: true },
  },
};

const WEAPON_SETTINGS = {
  src: weaponSpriteSheet,
  spriteWidth: 13,
  spriteHeight: 5,
  scale: 2,
  sequences: {
    default: { row: 0, fps: 1, numberOfFrames: 1, loop: false },
  },
};

function formatTimeRemaining(milliseconds: number) {
  const numberOfMinutes = Math.floor(milliseconds / (60 * 1000));
  const numberOfSeconds = Math.floor((milliseconds % (60 * 1000)) / 1000);

  const minutesString = numberOfMinutes.toString().padStart(2, '0');
  const secondsString = numberOfSeconds.toString().padStart(2, '0');

  return `${minutesString}:${secondsString}`;
}

export function initializeGame(roomId: string, player: PlayerId) {
  // Set of active weapon IDs registered locally, should be synced with the server state.
  const localWeaponsState = new Map<string, WeaponState>();
  const timeRemainingElement = $('#time-remaining');

  const app = new Application({
    rootElementSelector: '#game-container',
    width: 1400,
    height: 630,
    background: `url(${backgroundImage}) no-repeat center/105%`,
    fps: 60,
  });

  initializeControl(roomId, player, app);

  const playerA = new Sprite(PLAYER_SETTINGS);
  const playerB = new Sprite(PLAYER_SETTINGS);

  // const clip = new Circle(100, 100, 100);
  // clip.setMode('clip');
  // app.registerObject('clip', clip);

  app.registerObject('player1', playerA);
  app.registerObject('player2', playerB);

  playerA.setSequence('moveLeft');
  playerB.setSequence('moveLeft');

  playerA.canvasX = 100;
  playerA.canvasY = 100;

  playerB.canvasX = 100;
  playerB.canvasY = 200;

  app.onTick(() => {
    for (const weapon of localWeaponsState.values()) {
      const timeElapsed = performance.now() - weapon.createdAt;
      const distanceTraveled = timeElapsed * 0.5;

      const newX = weapon.x + weapon.directionNormVector.x * distanceTraveled;
      const newY = weapon.y + weapon.directionNormVector.y * distanceTraveled;

      if (
        (newX < 0 ||
          newX > app.getWidth() ||
          newY < 0 ||
          newY > app.getHeight()) &&
        weapon.id.startsWith(`player${player}-`)
      ) {
        socket.emit('removeWeapon', { roomId, player, weaponId: weapon.id });
        continue;
      }

      const weaponSprite = app.getObject(weapon.id) as Sprite | undefined;
      if (weaponSprite) {
        weaponSprite.canvasX = newX;
        weaponSprite.canvasY = newY;
      }
    }
  });

  // $(document).on('mousemove', (event) => {
  //   const canvasRect = app.getCanvasRect();
  //   if (!canvasRect) return;

  //   const canvasX = event.clientX - canvasRect.left;
  //   const canvasY = event.clientY - canvasRect.top;

  //   arrow.rotation = Math.atan2(
  //     canvasY - arrow.canvasY,
  //     canvasX - arrow.canvasX,
  //   );
  // });

  socket.on('gameStateUpdate', (newState: GameState) => {
    console.log('Received game state update:', newState);
    playerA.canvasX = newState.player1.x;
    playerA.canvasY = newState.player1.y;

    playerB.canvasX = newState.player2.x;
    playerB.canvasY = newState.player2.y;

    const weaponsMap = new Map(
      newState.weapons.map((weapon) => [weapon.id, weapon]),
    );
    const remoteWeaponIds = new Set(weaponsMap.keys());
    const localWeaponIds = new Set(localWeaponsState.keys());

    const newWeaponIds = remoteWeaponIds.difference(localWeaponIds);
    const removedWeaponIds = localWeaponIds.difference(remoteWeaponIds);

    for (const weaponId of newWeaponIds) {
      const weapon = weaponsMap.get(weaponId);
      if (!weapon) {
        continue;
      }

      sounds.playSfx('shoot', 0.2);

      const weaponSprite = new Sprite(WEAPON_SETTINGS);
      weaponSprite.setSequence('default');
      weaponSprite.canvasX = weapon.x;
      weaponSprite.canvasY = weapon.y;
      weaponSprite.rotation = weapon.rotation;

      app.registerObject(weapon.id, weaponSprite);
      localWeaponsState.set(weapon.id, weapon);
    }

    for (const weaponId of removedWeaponIds) {
      console.log('Removing weapon with ID:', weaponId);
      app.removeObject(weaponId);
      localWeaponsState.delete(weaponId);
    }

    timeRemainingElement.text(formatTimeRemaining(newState.timeRemaining));

    // for (const weapon of newState.weapons) {
    // if (!weapons.has(weapon.id)) {
    //   const weaponSprite = new Sprite({
    //     src: playerSpriteSheet,
    //     spriteWidth: 13,
    //     spriteHeight: 5,
    //     scale: 2,
    //     sequences: {
    //       default: { row: 0, fps: 1, numberOfFrames: 1, loop: false },
    //     },
    //   });

    //   weaponSprite.setSequence('default');
    //   weaponSprite.canvasX = weapon.x;
    //   weaponSprite.canvasY = weapon.y;
    //   weaponSprite.rotation = weapon.rotation;

    //   app.registerObject(weapon.id, weaponSprite);
    //   weapons.add(weapon.id);
    // } else {
    //   app.removeObject(weapon.id);
    //   weapons.delete(weapon.id);
    // }
    // }
  });

  app.initialize();
}
