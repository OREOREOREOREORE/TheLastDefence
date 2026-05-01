import $ from 'jquery';
import { socket } from './socket';
import type { PlayerId } from '../common/game-state';
import type { Application } from '../engine/application';

const OBSERVED_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
] as const;

// $(() => {
export function initializeControl(
  roomId: string,
  player: PlayerId,
  app: Application
) {
  $(document).on('keydown', (event) => {
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
  });

  $(document).on('click', (event) => {
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
      createdAt: performance.now(),
      directionNormVector,
    });
  });
}
// });
