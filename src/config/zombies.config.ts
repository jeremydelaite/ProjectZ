import { ZombieStats } from '../types';

// 🧟 Le Fantassin — zombie de base (Issue #4)
// Soldat de la Wehrmacht réanimé. Lent, peu de PV, toujours majoritaire.
export const FANTASSIN_STATS: ZombieStats = {
  hp: 50,              // PV à la manche 1 (scaling via formule plus tard)
  speed: 60,           // marche traînante (joueur : 200)
  damage: 20,          // dégâts par coup
  attackCooldown: 1000, // ms entre deux coups
};

// Points (style COD Zombies)
export const POINTS_PER_HIT = 10;  // balle qui touche
export const POINTS_PER_KILL = 50; // bonus à la mort

// Spawner de test — sera remplacé par le système de manches (Issue #4)
export const TEST_SPAWN_DELAY = 2000;    // ms entre deux spawns
export const MAX_ZOMBIES_ON_SCREEN = 10; // plafond simultané (24-30 prévu en prod)
