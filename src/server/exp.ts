import type { BaseDefenseState, PlayerState } from "../common/game-state.js";

const STARTING_EXP_TO_NEXT = 30;
const EXP_GROWTH_RATE = 1.5;
const EXP_PER_KILL = 10;

const STARTING_PLAYER = {
    level: 1,
    exp: 0,
    expToNext: STARTING_EXP_TO_NEXT,
    damage: 10,
    speed: 10,
    maxHealth: 100,
}

const UPGRADES = [
    (p: PlayerState) => {p.damage +=5;},
    (p: PlayerState) => {p.speed +=5;},
    (p: PlayerState) => {p.maxHealth +=20; p.health +=20;},
    (_: PlayerState, base: BaseDefenseState) => {base.health +=30; base.maxHealth +=30;},
]

function awardKill (p: PlayerState, base: BaseDefenseState) {
    p.exp += EXP_PER_KILL;
    while(p.exp >= p.expToNext){
        p.exp -= p.expToNext;
        p.level += 1;
        p.expToNext = Math.ceil(p.expToNext * EXP_GROWTH_RATE);

        const upgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
        upgrade(p, base);
    }
}

export { STARTING_PLAYER, awardKill };
