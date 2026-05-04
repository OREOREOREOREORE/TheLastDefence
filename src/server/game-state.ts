import type { GameState, PlayerId } from '../common/game-state.ts';
import { maybeSpawnMonster, tickMonsters, resetMonsterRoom } from './monster.ts';

const DELTA = 10;
const TICK_MS = 100;
export type GameEndReason = 'finished' | 'gameOver';

const gameStates = new Map<string, GameState>();
// Timeout can't be serialized, so we keep it separate from the game state.
const gameIntervals = new Map<string, NodeJS.Timeout>();

export function addNewGameState(roomId: string, initialState: GameState) {
  gameStates.set(roomId, initialState);
}

export function getGameState(roomId: string): GameState | undefined {
  return gameStates.get(roomId);
}

export function incrementX(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  const delta = DELTA * (state?.isCheatModeActivated ? 2 : 1);

  if (state) {
    if (player === 1 && state.player1.health > 0) {
      state.player1.x += delta;
      state.player1.direction = 'right';
    } else if (player === 2 && state.player2.health > 0) {
      state.player2.x += delta;
      state.player2.direction = 'right';
    }
  }

  return state;
}

export function decrementX(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  const delta = DELTA * (state?.isCheatModeActivated ? 2 : 1);

  if (state) {
    if (player === 1 && state.player1.health > 0) {
      state.player1.x -= delta;
      state.player1.direction = 'left';
    } else if (player === 2 && state.player2.health > 0) {
      state.player2.x -= delta;
      state.player2.direction = 'left';
    }
  }

  return state;
}

export function incrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  const delta = DELTA * (state?.isCheatModeActivated ? 2 : 1);

  if (state) {
    if (player === 1 && state.player1.health > 0) {
      state.player1.y += delta;
      state.player1.direction = 'forward';
    } else if (player === 2 && state.player2.health > 0) {
      state.player2.y += delta;
      state.player2.direction = 'forward';
    }
  }

  return state;
}

export function decrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  const delta = DELTA * (state?.isCheatModeActivated ? 2 : 1);

  if (state) {
    if (player === 1 && state.player1.health > 0) {
      state.player1.y -= delta;
      state.player1.direction = 'backward';
    } else if (player === 2 && state.player2.health > 0) {
      state.player2.y -= delta;
      state.player2.direction = 'backward';
    }
  }

  return state;
}

export function addWeapon(
  roomId: string,
  player: PlayerId,
  weaponId: string,
  rotation: number,
  createdAt: number,
  directionNormVector: { x: number; y: number },
) {
  const state = gameStates.get(roomId);
  if (state) {
    const playerState = player === 1 ? state.player1 : state.player2;

    if (playerState.health <= 0) {
      return state;
    }

    state.weapons.push({
      id: weaponId,
      x: playerState.x,
      y: playerState.y,
      rotation,
      createdAt,
      directionNormVector,
    });

    playerState.numberOfWeaponsUsed += 1;
  }

  return state;
}

export function removeWeapon(roomId: string, weaponId: string) {
  const state = gameStates.get(roomId);
  if (state) {
    state.weapons = state.weapons.filter((weapon) => weapon.id !== weaponId);
  }

  return state;
}

export function startGameTimer(
  roomId: string,
  onTick: (state: GameState) => void,
  onGameEnd: (state: GameState, reason: GameEndReason) => void,
) {

  resetMonsterRoom(roomId);

  gameIntervals.set(
    roomId,
    setInterval(() => {
      const gameState = gameStates.get(roomId);
      if (!gameState) {
        return;
      }

      const now = Date.now();
      const dtsec = TICK_MS / 1000;
      tickMonsters(gameState, now, dtsec);
      maybeSpawnMonster(gameState, roomId, dtsec);

      gameState.timeRemaining -= TICK_MS;
      onTick(gameState);

      const baseDestroyed = gameState.base.health <= 0;
      const bothPlayersDead = gameState.player1.health <= 0 && gameState.player2.health <= 0;
      const timesUp = gameState.timeRemaining <= 0;

      if (baseDestroyed || bothPlayersDead || timesUp) {
        clearInterval(gameIntervals.get(roomId));
        gameIntervals.delete(roomId);
        resetMonsterRoom(roomId);
        const reason: GameEndReason = baseDestroyed || bothPlayersDead ? 'gameOver' : 'finished';
        onGameEnd(gameState, reason);
      }
    }, TICK_MS),
  );
}

export function stopGameTimer(roomId: string) {
  clearInterval(gameIntervals.get(roomId));
  gameIntervals.delete(roomId);
  resetMonsterRoom(roomId);
}

export function addHealth(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);

  if (state) {
    const targetPlayer = player === 1 ? state.player2 : state.player1;

    targetPlayer.health = Math.min(100, targetPlayer.health + 10);
  }

  return state;
}

export function damagePlayer(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);

  if (state && !state.isCheatModeActivated) {
    const targetPlayer = player === 1 ? state.player1 : state.player2;

    targetPlayer.health = Math.max(0, targetPlayer.health - 20);
  }

  return state;
}

export function toggleCheatMode(roomId: string) {
  const state = gameStates.get(roomId);

  if (state) {
    state.isCheatModeActivated = !state.isCheatModeActivated;

    if (state.isCheatModeActivated) {
      state.player1.health = 100;
      state.player2.health = 100;
    }
  }

  return state;
}
