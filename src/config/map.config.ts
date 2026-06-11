// Map du village des Ardennes — Étape 4
// Placeholder : rectangles, en attendant les vrais assets.

export const MAP_WIDTH = 2560;
export const MAP_HEIGHT = 1440;

export const PLAYER_START = { x: 1280, y: 850 };

export interface RectDef {
  x: number; // centre
  y: number;
  w: number;
  h: number;
  color: number;
}

const STONE = 0x3a3a3a;   // murs d'enceinte
const RUIN = 0x4a4038;    // maisons en ruine
const WOOD = 0x5d4037;    // barricades / étals
const METAL = 0x37474f;   // carcasse de char

// Épaisseur du périmètre
const T = 32;
// Brèches de 200 px au milieu de chaque côté (points d'entrée des zombies)

export const WALLS: RectDef[] = [
  // --- Périmètre nord (brèche centrée sur x=1280 : lisière de forêt) ---
  { x: 590, y: T / 2, w: 1180, h: T, color: STONE },
  { x: 1970, y: T / 2, w: 1180, h: T, color: STONE },
  // --- Périmètre sud (brèche centrée sur x=1280) ---
  { x: 590, y: MAP_HEIGHT - T / 2, w: 1180, h: T, color: STONE },
  { x: 1970, y: MAP_HEIGHT - T / 2, w: 1180, h: T, color: STONE },
  // --- Périmètre ouest (brèche centrée sur y=720 : ruelle) ---
  { x: T / 2, y: 310, w: T, h: 620, color: STONE },
  { x: T / 2, y: 1130, w: T, h: 620, color: STONE },
  // --- Périmètre est (brèche centrée sur y=720 : ruelle) ---
  { x: MAP_WIDTH - T / 2, y: 310, w: T, h: 620, color: STONE },
  { x: MAP_WIDTH - T / 2, y: 1130, w: T, h: 620, color: STONE },

  // --- Église au clocher effondré (point central du village, côté nord) ---
  { x: 1280, y: 420, w: 240, h: 300, color: RUIN },
  { x: 1140, y: 560, w: 60, h: 60, color: STONE }, // gravats du clocher

  // --- Maisons à colombages en ruine, quartier ouest ---
  { x: 600, y: 350, w: 180, h: 140, color: RUIN },
  { x: 350, y: 600, w: 140, h: 180, color: RUIN },
  { x: 850, y: 600, w: 160, h: 120, color: RUIN },
  // --- Quartier est ---
  { x: 1960, y: 350, w: 180, h: 140, color: RUIN },
  { x: 2210, y: 600, w: 140, h: 180, color: RUIN },
  { x: 1710, y: 600, w: 160, h: 120, color: RUIN },
  // --- Maisons sud ---
  { x: 600, y: 1150, w: 200, h: 140, color: RUIN },
  { x: 1960, y: 1150, w: 200, h: 140, color: RUIN },

  // --- Place du marché : étals barricadés ---
  { x: 1130, y: 850, w: 60, h: 40, color: WOOD },
  { x: 1430, y: 850, w: 60, h: 40, color: WOOD },
  { x: 1280, y: 980, w: 80, h: 40, color: WOOD },

  // --- Carcasse de char ---
  { x: 950, y: 1100, w: 150, h: 80, color: METAL },

  // --- Barricades en retrait des brèches (couverture partielle) ---
  { x: 1280, y: 200, w: 160, h: 30, color: WOOD },
  { x: 1280, y: 1280, w: 160, h: 30, color: WOOD },
  { x: 220, y: 720, w: 30, h: 160, color: WOOD },
  { x: 2340, y: 720, w: 30, h: 160, color: WOOD },
];

// Points d'apparition des zombies : juste à l'intérieur des 4 brèches
export const SPAWN_POINTS = [
  { x: 1280, y: 60 },          // brèche nord — lisière de forêt
  { x: 1280, y: MAP_HEIGHT - 60 }, // brèche sud
  { x: 60, y: 720 },           // ruelle ouest
  { x: MAP_WIDTH - 60, y: 720 },   // ruelle est
];

export const SPAWN_JITTER = 50; // dispersion aléatoire autour du point
