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
  speed: 175,           // course rapide, juste sous le joueur (200)
  damage: 15,
  attackCooldown: 1000,
};

// 💀 Le soldat SS — relève de la Wehrmacht
// Plus costaud et aussi rapide qu'un sprint de civil : il remplace
// progressivement le Fantassin à partir de la manche 6.
export const SS_STATS: ZombieStats = {
  kind: 'ss',
  hp: 60,               // +20 % du Fantassin (scalés via ssHpForRound)
  speed: 130,
  damage: 25,
  attackCooldown: 1000,
};

// ☠️ Le Gazé — victime des gaz de combat
// Silhouette difforme, démarche erratique. Explose à la mort OU au contact :
// nuage de poison qui fait des dégâts sur la durée. À tuer À DISTANCE.
export const GAZE_STATS: ZombieStats = {
  kind: 'gaze',
  hp: 30,               // 60 % du Fantassin (scalés via gazeHpForRound)
  speed: 90,            // moyenne, mais trajectoire erratique
  damage: 0,            // pas de coup : il explose au contact
  attackCooldown: 1000,
};

// Nuage de poison laissé par l'explosion d'un Gazé
export const POISON_DPS = 10;        // dégâts par seconde dans la zone
export const POISON_DURATION = 4000; // ms de vie du nuage
export const POISON_RADIUS = 90;     // rayon du nuage

// Caisses de munitions lâchées par le dernier Gazé des manches spéciales :
// permanentes tant qu'on ne les ramasse pas, mais 5 max sur la map
// (au-delà, la plus ancienne disparaît)
export const AMMO_CRATE_MAX = 5;

/** Manche spéciale 100 % Gazés toutes les 5 manches (5, 10, 15…). */
export function isSpecialRound(round: number): boolean {
  return round >= 5 && round % 5 === 0;
}

/**
 * Proportion de SS parmi les fantassins : manche 6 (10 %), +8 %/manche,
 * plafonnée à 85 % — dans les hautes manches la Wehrmacht a presque disparu.
 */
export function ssRatioForRound(round: number): number {
  if (round < 6) return 0;
  return Math.min(0.85, 0.10 + (round - 6) * 0.08);
}

/** PV du SS : 120 % de ceux du Fantassin à la même manche. */
export function ssHpForRound(round: number): number {
  return Math.round(fantassinHpForRound(round) * 1.2);
}

/** PV du Gazé : 60 % de ceux du Fantassin à la même manche. */
export function gazeHpForRound(round: number): number {
  return Math.round(fantassinHpForRound(round) * 0.6);
}

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
