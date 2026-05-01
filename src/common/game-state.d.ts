interface BaseState {
  x: number;
  y: number;
}

export interface PlayerState extends BaseState {
  health: number;
}

export interface WeaponState extends BaseState {
  id: string;
  rotation: number;
  createdAt: number;
  directionNormVector: { x: number; y: number };
}
export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  weapons: WeaponState[];
}

export type PlayerId = 1 | 2;

export interface GameStateUpdateRequestMessage {
  roomId: string;
  player: PlayerId;
}

export interface AddWeaponRequestMessage extends GameStateUpdateRequestMessage {
  weaponId: string;
  rotation: number;
  createdAt: number;
  directionNormVector: { x: number; y: number };
}

export interface RemoveWeaponRequestMessage extends GameStateUpdateRequestMessage {
  weaponId: string;
}
