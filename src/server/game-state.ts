import type { GameState, PlayerId } from '../common/game-state.ts';

const DELTA = 10;

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
  if (state) {
    if (player === 1) {
      state.player1.x += DELTA;
    } else {
      state.player2.x += DELTA;
    }
  }

  return state;
}

export function decrementX(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 1) {
      state.player1.x -= DELTA;
    } else {
      state.player2.x -= DELTA;
    }
  }

  return state;
}

export function incrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 1) {
      state.player1.y += DELTA;
    } else {
      state.player2.y += DELTA;
    }
  }

  return state;
}

export function decrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 1) {
      state.player1.y -= DELTA;
    } else {
      state.player2.y -= DELTA;
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
    state.weapons.push({
      id: weaponId,
      x: playerState.x,
      y: playerState.y,
      rotation,
      createdAt,
      directionNormVector,
    });
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
  onGameEnd: () => void,
) {
  gameIntervals.set(
    roomId,
    setInterval(() => {
      const gameState = gameStates.get(roomId);
      if (!gameState) {
        return;
      }

      gameState.timeRemaining -= 1000;
      onTick(gameState);

      if (gameState.timeRemaining <= 0) {
        clearInterval(gameIntervals.get(roomId));
        gameIntervals.delete(roomId);

        onGameEnd();
      }
    }, 1000),
  );
}

export function stopGameTimer(roomId: string) {
  clearInterval(gameIntervals.get(roomId));
  gameIntervals.delete(roomId);
}