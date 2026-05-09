import type {
  GameState,
  MonsterState,
  PlayerId,
  PlayerState,
} from '../common/game-state.ts';

interface PlayerCandidate {
  id: PlayerId;
  player: PlayerState;
}

interface NearestPlayerResult extends PlayerCandidate {
  dist: number;
}

// ─── Tunables ───────────────────────────────────────────────────────────────

const GAME_LENGTH_MS = 4 * 60 * 1000;

const MONSTER_STATS = {
  maxHealth: 30,
  speed: 20, // px/sec
  attackDamage: 5,
  detectionRadius: 200,
  lostTargetRadius: 200 * 1.4,
  attackRadius: 32,
  attackCooldownMs: 1000,
};

const SPAWN_RATE_START = 0.3; // monsters/sec at t=0
const SPAWN_RATE_END = 2.5; // monsters/sec at t=GAME_LENGTH_MS
const MAX_ALIVE_MONSTERS = 30;

// ─── Per-room module state ──────────────────────────────────────────────────

let monsterCounter = 0;
const spawnAccumulator = new Map<string, number>();

export function resetMonsterRoom(roomId: string) {
  spawnAccumulator.delete(roomId);
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function spawnRatePerSec(progress: number): number {
  const p = clamp01(progress);
  return SPAWN_RATE_START + (SPAWN_RATE_END - SPAWN_RATE_START) * p * p;
}

function pickEdgeSpawn() {
  switch (Math.floor(Math.random() * 16)) {
    // top side
    case 0:
      return { x: 300, y: 100 };
    case 1:
      return { x: 400, y: 100 };
    case 2:
      return { x: 600, y: 100 };
    case 3:
      return { x: 800, y: 100 };
    case 4:
      return { x: 1000, y: 100 };
    // bottom side
    case 5:
      return { x: 300, y: 600 };
    case 6:
      return { x: 400, y: 600 };
    case 7:
      return { x: 600, y: 600 };
    case 8:
      return { x: 800, y: 600 };
    case 9:
      return { x: 1000, y: 600 };
    // left side
    case 10:
      return { x: 300, y: 300 };
    case 11:
      return { x: 300, y: 500 };
    case 12:
      return { x: 300, y: 650 };
    //right side
    case 13:
      return { x: 1000, y: 300 };
    case 14:
      return { x: 1000, y: 500 };
    default:
      return { x: 1000, y: 650 };
  }
}

function findNearestLivingPlayer(
  m: MonsterState,
  state: GameState,
): NearestPlayerResult | null {
  const candidates: PlayerCandidate[] = [
    { id: 1, player: state.player1 },
    { id: 2, player: state.player2 },
  ];

  let best: NearestPlayerResult | null = null;
  for (const c of candidates) {
    if (c.player.health <= 0) continue;

    const d = distance(m.x, m.y, c.player.x, c.player.y);
    if (best === null || d < best.dist) {
      best = { id: c.id, player: c.player, dist: d };
    }
  }
  return best;
}

function moveToward(
  m: MonsterState,
  targetX: number,
  targetY: number,
  dtSec: number,
  isTargetBase = false,
) {
  const dx = targetX - m.x;
  const dy = targetY - m.y;
  const len = Math.hypot(dx, dy);
  if (len < (isTargetBase ? 30 : 1e-3)) return;

  const step = Math.min(m.speed * dtSec, len);
  m.x += (dx / len) * step;
  m.y += (dy / len) * step;

  // Match player convention: +Y is "forward", -Y is "backward".
  m.direction =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? 'right'
        : 'left'
      : dy > 0
        ? 'forward'
        : 'backward';
}

// ─── Public API ─────────────────────────────────────────────────────────────

function spawnMonster(
  state: GameState,
  overrides: Partial<typeof MONSTER_STATS> = {},
): MonsterState {
  const stats = { ...MONSTER_STATS, ...overrides };
  const { x, y } = pickEdgeSpawn();
  monsterCounter += 1;

  const m: MonsterState = {
    id: `monster-${monsterCounter.toString()}`,
    x,
    y,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,

    speed: stats.speed,
    detectionRadius: stats.detectionRadius,
    lostTargetRadius: stats.lostTargetRadius,
    attackRadius: stats.attackRadius,
    attackDamage: stats.attackDamage,
    attackCooldownMs: stats.attackCooldownMs,

    lastAttackAt: 0,
    mode: 'chasingBase',
    targetType: 'base',
    targetId: 'base',
    direction: 'forward',
  };

  state.monsters.push(m);
  return m;
}

/** Accumulator-based spawner; rate scales over the round, framerate-independent. */
function maybeSpawnMonster(state: GameState, roomId: string, dtSec: number) {
  if (state.monsters.length >= MAX_ALIVE_MONSTERS) {
    spawnAccumulator.set(roomId, 0);
    return;
  }

  const progress = (GAME_LENGTH_MS - state.timeRemaining) / GAME_LENGTH_MS;
  let credits =
    (spawnAccumulator.get(roomId) ?? 0) + spawnRatePerSec(progress) * dtSec;

  while (credits >= 1 && state.monsters.length < MAX_ALIVE_MONSTERS) {
    spawnMonster(state);
    credits -= 1;
  }
  spawnAccumulator.set(roomId, credits);
}

/** Advances all monsters one tick. Mutates `state`. */
function tickMonsters(state: GameState, now: number, dtSec: number) {
  // Drop dead monsters first so AI never runs on corpses.
  state.monsters = state.monsters.filter((m) => m.health > 0);

  for (const m of state.monsters) {
    // 1. Target selection — uses per-monster radii with hysteresis.
    const nearest = findNearestLivingPlayer(m, state);
    const wasChasingPlayer = m.targetType === 'player';
    const detectThreshold = wasChasingPlayer
      ? m.lostTargetRadius
      : m.detectionRadius;

    if (nearest && nearest.dist <= detectThreshold) {
      m.targetType = 'player';
      m.targetId = nearest.id;
    } else {
      m.targetType = 'base';
      m.targetId = 'base';
    }

    // 2. Resolve target position.
    const target =
      m.targetType === 'player'
        ? m.targetId === 1
          ? state.player1
          : state.player2
        : state.base;

    const distToTarget = distance(m.x, m.y, target.x, target.y);

    // 3. Attack if in range, otherwise move.
    if (distToTarget <= m.attackRadius) {
      m.mode = 'attacking';
      if (now - m.lastAttackAt >= m.attackCooldownMs) {
        m.lastAttackAt = now;
        if (!state.isCheatModeActivated) {
          if (m.targetType === 'player') {
            const p = m.targetId === 1 ? state.player1 : state.player2;
            p.health = Math.max(0, p.health - m.attackDamage);
          } else {
            state.base.health = Math.max(0, state.base.health - m.attackDamage);
          }
        }
      }
    } else {
      m.mode = m.targetType === 'player' ? 'chasingPlayer' : 'chasingBase';
      moveToward(m, target.x, target.y, dtSec, m.targetType === 'base');
    }
  }
}

/** Returns true if the monster was killed by this hit. */
function damageMonster(
  state: GameState,
  monsterId: string,
  amount: number,
): boolean {
  const m = state.monsters.find((x) => x.id === monsterId);
  if (!m) return false;
  m.health = Math.max(0, m.health - amount);
  return m.health <= 0;
}

export { damageMonster, tickMonsters, maybeSpawnMonster, spawnMonster };
