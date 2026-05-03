interface BaseState {
  x: number;
  y: number;
}

export interface PlayerState extends BaseState {
  health: number;
  numberOfWeaponsUsed: number;
  numberOfKills: number;
  direction: 'forward' | 'backward' | 'left' | 'right';
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
  timeRemaining: number;
  isCheatModeActivated: boolean;
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

export interface WeaponHitMessage<
  T extends 'player' | 'monster',
> extends GameStateUpdateRequestMessage {
  roomId: string;
  targetType: T;
  targetId: T extends 'player' ? PlayerId : string;
  weaponId: string;
}
