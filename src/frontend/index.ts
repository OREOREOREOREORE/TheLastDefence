import $ from 'jquery';
import { initializeUI } from './ui';
import sounds from './music';

import gameRoomBGM from '../../asset/sounds/game-room.mp3';
import inGameGBM from '../../asset/sounds/in-game.mp3';

import weaponSFX from '../../asset/sounds/weapon.wav';
import addHealthSFX from '../../asset/sounds/add-health.wav';
import deadSFX from '../../asset/sounds/dead.wav';
import monsterDeadSFX from '../../asset/sounds/monster-dead.wav';
import baseDestroyedSFX from '../../asset/sounds/base-destroyed.wav';
import gameOverSFX from '../../asset/sounds/game-over.wav';
import victorySFX from '../../asset/sounds/victory.mp3';

await Promise.all([
  sounds.load('game-room-bg', gameRoomBGM),
  sounds.load('in-game-bg', inGameGBM),
  sounds.load('shoot', weaponSFX),
  sounds.load('addHealth', addHealthSFX),
  sounds.load('dead', deadSFX),
  sounds.load('monster-dead', monsterDeadSFX),
  sounds.load('base-damaged', baseDestroyedSFX),
  sounds.load('game-over', gameOverSFX),
  sounds.load('victory', victorySFX),
]);

$(() => {
  initializeUI();
  sounds.playBgm('game-room-bg', 0.05);
});
