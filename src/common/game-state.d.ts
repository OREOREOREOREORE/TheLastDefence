interface BaseState {
  x: number;
  y: number;
}

export interface BaseDefenseState extends BaseState {
  health: number;
  maxHealth: number;
}

export interface PlayerState extends BaseState {
  health: number;
  numberOfWeaponsUsed: number;
  numberOfHits: number;
  direction: 'forward' | 'backward' | 'left' | 'right';

  level: number;
  exp: number;
  expToNext: number;
  damage: number;
  speed: number;
  maxHealth: number;
}

export interface WeaponState extends BaseState {
  id: string;
  rotation: number;
  createdAt: number;
  directionNormVector: { x: number; y: number };
}

export type MonsterMode =
  | 'chasingBase'
  | 'chasingPlayer'
  | 'attacking';

export interface MonsterState extends BaseState {
  id: string;
  health: number;
  maxHealth: number;

  // Per-monster stats (allow archetypes without changing the AI loop)
  speed: number;
  detectionRadius: number;
  lostTargetRadius: number;
  attackRadius: number;
  attackDamage: number;
  attackCooldownMs: number;

  lastAttackAt: number;
  mode: MonsterMode;
  targetType: 'base' | 'player';
  targetId: PlayerId | 'base';
  direction: 'forward' | 'backward' | 'left' | 'right';
}

export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  base: BaseDefenseState;
  monsters: MonsterState[];
  weapons: WeaponState[];
  timeRemaining: number; // server side
  isCheatModeActivated: boolean;
  isMaskActivated: boolean;
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
