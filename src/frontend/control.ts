import $ from 'jquery';
import { socket } from './socket';

import sounds from './music';

import type { PlayerId } from '../common/game-state';
import type { Application } from '../engine/application';
import type { Sprite } from '../engine/sprite';

const OBSERVED_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'h',
] as const;

export function initializeControl(
  roomId: string,
  player: PlayerId,
  app: Application,
) {
  $(document).on('keydown.game', (event) => {
    if (!OBSERVED_KEYS.includes(event.key as (typeof OBSERVED_KEYS)[number])) {
      return;
    }

    event.preventDefault();

    if (event.key === 'ArrowUp' || event.key === 'w') {
      socket.emit('decrementY', { roomId, player });
    }

    if (event.key === 'ArrowDown' || event.key === 's') {
      socket.emit('incrementY', { roomId, player });
    }

    if (event.key === 'ArrowLeft' || event.key === 'a') {
      socket.emit('decrementX', { roomId, player });
    }

    if (event.key === 'ArrowRight' || event.key === 'd') {
      socket.emit('incrementX', { roomId, player });
    }

    if (event.key === 'h') {
      const currentPlayer = `player${player}`;
      const targetPlayer = `player${player === 1 ? 2 : 1}`;

      console.log('Checking collision for health pickup...');

      if (
        (app.getObject(currentPlayer) as Sprite).collidesWith(
          app.getObject(targetPlayer) as Sprite,
        )
      ) {
        socket.emit('addHealth', { roomId, player });
        sounds.playSfx('addHealth', 0.5);
      } else {
        console.log('No collision detected for health pickup.');
      }
    }
  });

  $(document).on('click.game', (event) => {
    const weaponId = `player${player}-${crypto.randomUUID()}`;
    const canvasRect = app.getCanvasRect();

    if (!canvasRect) {
      return;
    }

    const canvasX = event.clientX - canvasRect.left;
    const canvasY = event.clientY - canvasRect.top;

    const playerSprite = app.getObject(`player${player}`);

    if (!playerSprite) {
      return;
    }

    const directionX = canvasX - playerSprite.canvasX;
    const directionY = canvasY - playerSprite.canvasY;
    const norm = Math.sqrt(Math.pow(directionX, 2) + Math.pow(directionY, 2));
    const directionNormVector = { x: directionX / norm, y: directionY / norm };

    const rotation = Math.atan2(directionY, directionX);

    socket.emit('addWeapon', {
      roomId,
      player,
      weaponId,
      rotation,
      createdAt: Date.now(),
      directionNormVector,
    });
  });
}

export function cleanupControl() {
  $(document).off('.game');
}