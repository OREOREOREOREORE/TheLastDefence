import $ from 'jquery';
import { socket } from './socket';

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

$(() => {
  $(document).on('keydown', (event) => {
    if (!OBSERVED_KEYS.includes(event.key as (typeof OBSERVED_KEYS)[number])) {
      return;
    }

    event.preventDefault();

    if (event.key === 'ArrowUp' || event.key === 'w') {
      socket.emit('decrementY', { roomId: 'abc', player: 'A' });
    }

    if (event.key === 'ArrowDown' || event.key === 's') {
      socket.emit('incrementY', { roomId: 'abc', player: 'A' });
    }

    if (event.key === 'ArrowLeft' || event.key === 'a') {
      socket.emit('decrementX', { roomId: 'abc', player: 'A' });
    }

    if (event.key === 'ArrowRight' || event.key === 'd') {
      socket.emit('incrementX', { roomId: 'abc', player: 'A' });
    }
  });
});
