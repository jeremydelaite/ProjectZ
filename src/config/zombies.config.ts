import { ZombieStats } from '../types';

// 🧟 Le Fantassin — zombie de base (Issue #4)
// Soldat de la Wehrmacht réanimé. Lent, peu de PV, toujours majoritaire.
export const FANTASSIN_STATS: ZombieStats = {
  kind: 'fantassin',
  hp: 50,              // PV à la manche 1 (scalés via fantassinHpForRound)
  speed: 60,           // marche traînante (joueur : 200)
  damage: 20,          // dégâts par coup
  attackCooldown: 1000, // ms entre deux coups
};

// 🏃 Le Coureur — villageois fraîchement infecté
// Zombie « frais », rapide, en tenue civile. Force à prioriser les cibles.
export const COUREUR_STATS: ZombieStats = {
  kind: 'coureur',
  hp: 35,               // 70 % du Fantassin (scalés via coureurHpForRound)
  speed: 130,           // course (joueur : 200)
  damage: 15,
  attackCooldown: 1000,
};

/**
 * Proportion de Coureurs dans les spawns : apparaît à la manche 4 (5 %),
 * +2,5 % par manche, plafonnée à 25 %.
 */
export function coureurRatioForRound(round: number): number {
  if (round < 4) return 0;
  return Math.min(0.25, 0.05 + (round - 4) * 0.025);
}

/** PV du Coureur : 70 % de ceux du Fantassin à la même manche. */
export function coureurHpForRound(round: number): number {
  return Math.round(fantassinHpForRound(round) * 0.7);
}

// Points (style COD Zombies)
export const POINTS_PER_HIT = 10;  // balle qui touche
export const POINTS_PER_KILL = 50; // bonus à la mort

// --- Système de manches (Issue #4) ---

export const MAX_ZOMBIES_ON_SCREEN = 24;  // plafond simultané (perfs + lisibilité)

// Part des spawns en « sortie de terre dynamique » juste hors du champ
// de la caméra (le reste : points fixes les plus proches du joueur)
export const DYNAMIC_SPAWN_CHANCE = 0.5;

/**
 * Intervalle entre deux spawns selon la manche : départ tranquille,
 * accélère de manche en manche jusqu'à un plancher.
 * Manche 1 : 2800 ms · manche 4 : 1900 ms · manche 7+ : 1000 ms
 */
export function spawnIntervalForRound(round: number): number {
  return Math.max(1000, 2800 - (round - 1) * 300);
}
export const INTERMISSION_DURATION = 5000; // ms d'accalmie entre deux manches

/** Nombre total de zombies de la manche : 0.15·m² + 4·m + 6 */
export function zombiesForRound(round: number): number {
  return Math.round(0.15 * round * round + 4 * round + 6);
}

/**
 * PV du Fantassin selon la manche :
 * - jusqu'à la manche 10 : +10 % du PV de base par manche
 * - au-delà : exponentiel doux ×1.05 par manche
 * C'est ce scaling qui rendra l'amélioration d'armes obligatoire.
 */
export function fantassinHpForRound(round: number): number {
  const base = FANTASSIN_STATS.hp;
  if (round <= 10) {
    return Math.round(base * (1 + 0.10 * (round - 1)));
  }
  const hpRound10 = base * (1 + 0.10 * 9);
  return Math.round(hpRound10 * Math.pow(1.05, round - 10));
}
