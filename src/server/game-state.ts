import type { GameState, PlayerId } from '../common/game-state.ts';

const DELTA = 10;

const gameStates = new Map<string, GameState>();

export function addNewGameState(roomId: string, initialState: GameState) {
  gameStates.set(roomId, initialState);
}

export function getGameState(roomId: string): GameState | undefined {
  return gameStates.get(roomId);
}

export function incrementX(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 'A') {
      state.playerA.x += DELTA;
    } else {
      state.playerB.x += DELTA;
    }
  }

  return state;
}

export function decrementX(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 'A') {
      state.playerA.x -= DELTA;
    } else {
      state.playerB.x -= DELTA;
    }
  }

  return state;
}

export function incrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 'A') {
      state.playerA.y += DELTA;
    } else {
      state.playerB.y += DELTA;
    }
  }

  return state;
}

export function decrementY(roomId: string, player: PlayerId) {
  const state = gameStates.get(roomId);
  if (state) {
    if (player === 'A') {
      state.playerA.y -= DELTA;
    } else {
      state.playerB.y -= DELTA;
    }
  }

  return state;
}
