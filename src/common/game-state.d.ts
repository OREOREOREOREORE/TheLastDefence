export interface PlayerState {
  x: number;
  y: number;
  health: number;
}

export interface GameState {
  playerA: PlayerState;
  playerB: PlayerState;
}

export type PlayerId = 'A' | 'B';

export interface GameStateUpdateRequestMessage {
  roomId: string;
  player: PlayerId;
}
