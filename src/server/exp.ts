import type { BaseDefenseState, PlayerState } from "../common/game-state.js";

const STARTING_EXP_TO_NEXT = 30;
const EXP_GROWTH_RATE = 1.5;
const EXP_PER_KILL = 10;

const STARTING_PLAYER_STAT = {
    level: 1,
    exp: 0,
    expToNext: STARTING_EXP_TO_NEXT,
    damage: 10,
    speed: 10,
    maxHealth: 100,
}

const UPGRADES = [
    (p: PlayerState) => {p.damage +=5; return 'dmg';},
    (p: PlayerState) => {p.speed +=5; return 'spd';},
    (p: PlayerState) => {p.maxHealth +=20; p.health +=20; return 'hp';},
    (_: PlayerState, base: BaseDefenseState) => {base.health +=30; base.maxHealth +=30; return 'base';},
]

function awardKill (p: PlayerState, base: BaseDefenseState) {
    p.exp += EXP_PER_KILL;
    while(p.exp >= p.expToNext){
        p.exp -= p.expToNext;
        p.level += 1;
        p.expToNext = Math.ceil(p.expToNext * EXP_GROWTH_RATE);
        const upgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
        console.log(`upgrade: ${upgrade(p, base)}`);
    }
}

export { STARTING_PLAYER_STAT, awardKill };
