import { socket } from './socket';
import { initializeControl, cleanupControl, getLastKnownMousePosition } from './control';

import { Sprite } from '../engine/sprite';
import { Application } from '../engine/application';
import { Circle } from '../engine/circle';

import $ from 'jquery';

import player1SpriteSheet from '../../asset/player1-sprite-sheet.png';
import player2SpriteSheet from '../../asset/player2-sprite-sheet.png';
import weaponSpriteSheet from '../../asset/arrow.png';
import backgroundImage from '../../asset/game-background.png';

import monsterSpriteSheet from '../../asset/monster-sprite-sheet.png';
import baseImage from '../../asset/base.png';

import sounds from './music';

import type { GameState, PlayerId, WeaponState } from '../common/game-state';

const PLAYER_BASE_SETTINGS = {
  spriteWidth: 16,
  spriteHeight: 16,
  scale: 2,
  sequences: {
    forward: { column: 0, fps: 8, numberOfFrames: 4, loop: true },
    backward: { column: 1, fps: 8, numberOfFrames: 4, loop: true },
    left: { column: 2, fps: 8, numberOfFrames: 4, loop: true },
    right: { column: 3, fps: 8, numberOfFrames: 4, loop: true },
    dead: { row: 6, fps: 1, numberOfFrames: 1, loop: false },
  },
};

const PLAYER1_SETTINGS = {
  ...PLAYER_BASE_SETTINGS,
  src: player1SpriteSheet,
};

const PLAYER2_SETTINGS = {
  ...PLAYER_BASE_SETTINGS,
  src: player2SpriteSheet,
};

const WEAPON_SETTINGS = {
  src: weaponSpriteSheet,
  spriteWidth: 16,
  spriteHeight: 16,
  scale: 1,
  sequences: {
    default: { row: 0, fps: 1, numberOfFrames: 1, loop: false },
  },
};

const MONSTER_SETTINGS = {
  ...PLAYER_BASE_SETTINGS,
  src: monsterSpriteSheet,
  scale: 1.5,
};

const BASE_SETTINGS = {
  src: baseImage,
  spriteWidth: 64,
  spriteHeight: 46,
  scale: 1.5,
  sequences: {
    default: { column: 0, fps: 1, numberOfFrames: 1, loop: false },
    damaged: { column: 1, fps: 1, numberOfFrames: 1, loop: false },
    destroy: { column: 2, fps: 1, numberOfFrames: 1, loop: false },
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
  sounds.playBgm('in-game-bg', 0.05);

  // Set of active weapon IDs registered locally, should be synced with the server state.
  const localWeaponsState = new Map<string, WeaponState>();
  const timeRemainingElement = $('#time-remaining');
  const healthElement = $('#health');
  const partnerHealthElement = $('#partner-health');
  const cheatModeIndicatorElement = $('#cheat-mode');
  const baseHealthElement = $('#base-health');

  const localMonsterSprites = new Map<string, Sprite>();
  const baseSprite = new Sprite(BASE_SETTINGS);
  baseSprite.setSequence('default');

  let deadSFXPlayedForPlayer1 = false;
  let deadSFXPlayedForPlayer2 = false;
  let baseDamagedSFXPlayed = false;

  const app = new Application({
    rootElementSelector: '#game-container',
    width: 1400,
    height: 630,
    background: `url(${backgroundImage}) no-repeat center/105%`,
    fps: 60,
  });

  initializeControl(roomId, player, app);

  const player1 = new Sprite(PLAYER1_SETTINGS);
  const player2 = new Sprite(PLAYER2_SETTINGS);

  const mask = new Circle(0, 0, 200);
  mask.setMode('clip');
  mask.hide();
  app.registerObject('mask', mask);

  // const clip = new Circle(100, 100, 100);
  // clip.setMode('clip');
  // app.registerObject('clip', clip);

  app.registerObject('base', baseSprite);
  app.registerObject('player1', player1);
  app.registerObject('player2', player2);

  player1.setSequence('forward');
  player2.setSequence('forward');

  baseSprite.canvasX = 700;
  baseSprite.canvasY = 315;

  player1.canvasX = 600;
  player1.canvasY = 280;

  player2.canvasX = 800;
  player2.canvasY = 350;

  app.onTick(() => {
    for (const weapon of localWeaponsState.values()) {
      const timeElapsed = Math.max(Date.now() - weapon.createdAt, 0);
      if (timeElapsed === 0) {
        // The clock likely drifted backwards, skip this tick to avoid projectiles jumping forward.
        continue;
      }
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

      if (weapon.id.startsWith(`player${player}-`) && weaponSprite) {
        // 1. Monsters first
        let hitMonsterId: string | null = null;
        for (const [monsterId, monsterSprite] of localMonsterSprites) {
          if (weaponSprite.collidesWith(monsterSprite)) {
            hitMonsterId = monsterId;
            break;
          }
        }
        if (hitMonsterId) {
          socket.emit('weaponHit', {
            roomId,
            player,
            targetType: 'monster',
            targetId: hitMonsterId,
            weaponId: weapon.id,
          });
          continue;
        }

        // 2. Then partner (existing PvP behavior)
        if (weaponSprite.collidesWith(player === 1 ? player2 : player1)) {
          socket.emit('weaponHit', {
            roomId,
            player,
            targetType: 'player',
            targetId: player === 1 ? 2 : 1,
            weaponId: weapon.id,
          });
          continue;
        }
      }

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
    // if (newState.base){
    baseSprite.canvasX = newState.base.x;
    baseSprite.canvasY = newState.base.y;
    const currentBaseHealthText = baseHealthElement.text();
    const displayedMaxHealth = Number.parseInt(
      currentBaseHealthText.split('/')[1] ?? '',
      10,
    );
    const stateBase = newState.base as typeof newState.base & {
      maxHealth?: number;
    };

    const me = player === 1 ? newState.player1 : newState.player2;
    $('#level').text(me.level);
    $('#exp').text(me.exp);
    $('#exp-to-next').text(me.expToNext);
    $('#exp-bar-fill').css('width', `${((me.exp / me.expToNext) * 100).toFixed(1)}%`);
    $('#stat-damage').text(me.damage);
    $('#stat-speed').text(me.speed);
    $('#stat-maxhealth').text(me.maxHealth);


    const maxBaseHealth =
      typeof stateBase.maxHealth === 'number'
        ? stateBase.maxHealth
        : Number.isFinite(displayedMaxHealth)
          ? displayedMaxHealth
          : newState.base.health;
    baseHealthElement
      .text(
        `${newState.base.health} /${maxBaseHealth} ${newState.isCheatModeActivated ? '[Immortal]' : ''}`,
      )
      .css('color', newState.base.health <= 20 ? 'crimson' : 'white');
    // }

    if (newState.base.health <= newState.base.maxHealth * 0.5) {
      baseSprite.setSequence('damaged');
      if (!baseDamagedSFXPlayed) {
        sounds.playSfx('base-damaged', 0.5);
        baseDamagedSFXPlayed = true;
      }
    }

    if (newState.base.health <= 0) {
      baseSprite.setSequence('destroy');
    }

    const inComingMonster = newState.monsters;
    const inComingMonsterIds = new Set(inComingMonster.map((m) => m.id));

    for (const id of [...localMonsterSprites.keys()]) {
      if (!inComingMonsterIds.has(id)) {
        app.removeObject(id);
        localMonsterSprites.delete(id);
        sounds.playSfx('monster-dead', 0.2);
      }
    }

    for (const m of inComingMonster) {
      let monsterSprite = localMonsterSprites.get(m.id);
      if (!monsterSprite) {
        monsterSprite = new Sprite(MONSTER_SETTINGS);
        localMonsterSprites.set(m.id, monsterSprite);
        app.registerObject(m.id, monsterSprite);
      }
      monsterSprite.canvasX = m.x;
      monsterSprite.canvasY = m.y;
      monsterSprite.setSequence(m.direction);
    }

    player1.canvasX = newState.player1.x;
    player1.canvasY = newState.player1.y;
    if (newState.player1.health <= 0) {
      if (!deadSFXPlayedForPlayer1) {
        sounds.playSfx('dead', 0.5);
        deadSFXPlayedForPlayer1 = true;
      }

      player1.setSequence('dead');
    } else {
      player1.setSequence(newState.player1.direction as string);
      deadSFXPlayedForPlayer1 = false;
    }

    player2.canvasX = newState.player2.x;
    player2.canvasY = newState.player2.y;
    if (newState.player2.health <= 0) {
      if (!deadSFXPlayedForPlayer2) {
        sounds.playSfx('dead', 0.5);
        deadSFXPlayedForPlayer2 = true;
      }

      player2.setSequence('dead');
    } else {
      player2.setSequence(newState.player2.direction as string);
      deadSFXPlayedForPlayer2 = false;
    }

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

      sounds.playSfx('shoot', 0.05);

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

    const playerHealth =
      player === 1 ? newState.player1.health : newState.player2.health;
    const partnerHealth =
      player === 1 ? newState.player2.health : newState.player1.health;

    healthElement
      .text(
        `${playerHealth} /${newState.player1.maxHealth}${newState.isCheatModeActivated ? ' [Immortal]' : ''}`,
      )
      .css('color', playerHealth <= 20 ? 'crimson' : 'white');
    partnerHealthElement
      .text(
        `${partnerHealth} /${newState.player2.maxHealth}${newState.isCheatModeActivated ? ' [Immortal]' : ''}`,
      )
      .css('color', partnerHealth <= 20 ? 'crimson' : 'white');

    if (newState.isCheatModeActivated) {
      cheatModeIndicatorElement.removeClass('hidden');
    } else {
      cheatModeIndicatorElement.addClass('hidden');
    }

    if (newState.isMaskActivated) {
      const { x, y } = getLastKnownMousePosition();
      mask.canvasX = x;
      mask.canvasY = y;
      mask.show();
    } else {
      mask.hide();
    }
  });

  app.initialize();

  return () => {
    socket.removeListener('gameStateUpdate');
    cleanupControl();
    app.destroy();
  };
}
