// Map du village des Ardennes — Étape 4 (v2 : départ dans l'église)
// Placeholder : rectangles, en attendant les vrais assets.

export const MAP_WIDTH = 2560;
export const MAP_HEIGHT = 1440;

// Le joueur démarre devant l'autel de l'église
export const PLAYER_START = { x: 1280, y: 400 };

export interface RectDef {
  x: number; // centre
  y: number;
  w: number;
  h: number;
  color: number;
}

export interface DebrisDef extends RectDef {
  price: number;
  label: string;
}

const STONE = 0x3a3a3a;   // murs d'enceinte / pierre
const CHURCH = 0x55504a;  // murs de l'église
const RUIN = 0x4a4038;    // maisons en ruine
const WOOD = 0x5d4037;    // barricades / étals
const METAL = 0x37474f;   // carcasse de char
const ALTAR = 0x8d8273;   // autel de pierre
const GLASS = 0x5c6bc0;   // vitraux brisés
const RUBBLE = 0x6d5a43;  // débris déblayables

// Épaisseur du périmètre du village
const T = 32;
// Épaisseur des murs de l'église
const CT = 24;

/*
 * L'ÉGLISE (salle de départ, ~600×440 intérieur) :
 *   intérieur x 980→1580, y 260→700
 *   - autel au nord, joueur devant
 *   - 3 vitraux brisés (entrées zombies, infranchissables pour le joueur,
 *     les balles passent) : 2 au nord, 1 à l'ouest
 *   - 2 sorties bloquées par des débris (750 pts) : porte principale au sud,
 *     mur effondré à l'est
 *   - 2 colonnes intérieures pour faire tourner les trains de zombies
 */

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

  // --- ÉGLISE — mur nord (vitraux : x 1080-1160 et 1400-1480) ---
  { x: 1030, y: 260, w: 100, h: CT, color: CHURCH },
  { x: 1280, y: 260, w: 240, h: CT, color: CHURCH },
  { x: 1530, y: 260, w: 100, h: CT, color: CHURCH },
  // --- ÉGLISE — mur sud (porte principale : x 1230-1330) ---
  { x: 1105, y: 700, w: 250, h: CT, color: CHURCH },
  { x: 1455, y: 700, w: 250, h: CT, color: CHURCH },
  // --- ÉGLISE — mur ouest (vitrail : y 430-510) ---
  { x: 980, y: 345, w: CT, h: 170, color: CHURCH },
  { x: 980, y: 605, w: CT, h: 190, color: CHURCH },
  // --- ÉGLISE — mur est (mur effondré : y 430-530) ---
  { x: 1580, y: 345, w: CT, h: 170, color: CHURCH },
  { x: 1580, y: 615, w: CT, h: 170, color: CHURCH },
  // --- ÉGLISE — autel et colonnes ---
  { x: 1280, y: 320, w: 140, h: 36, color: ALTAR },
  { x: 1130, y: 520, w: 40, h: 40, color: STONE },
  { x: 1430, y: 520, w: 40, h: 40, color: STONE },

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

  // --- Place du marché (au sud de l'église) : étals barricadés ---
  { x: 1130, y: 880, w: 60, h: 40, color: WOOD },
  { x: 1430, y: 880, w: 60, h: 40, color: WOOD },
  { x: 1280, y: 1000, w: 80, h: 40, color: WOOD },

  // --- Carcasse de char ---
  { x: 950, y: 1100, w: 150, h: 80, color: METAL },

  // --- Barricades en retrait des brèches du village ---
  { x: 1280, y: 1280, w: 160, h: 30, color: WOOD },
  { x: 220, y: 720, w: 30, h: 160, color: WOOD },
  { x: 2340, y: 720, w: 30, h: 160, color: WOOD },
];

// Vitraux brisés : bloquent le JOUEUR uniquement.
// Les zombies les escaladent, les balles passent au travers.
export const VITRAUX: RectDef[] = [
  { x: 1120, y: 260, w: 80, h: CT, color: GLASS },  // nord-ouest
  { x: 1440, y: 260, w: 80, h: CT, color: GLASS },  // nord-est
  { x: 980, y: 470, w: CT, h: 80, color: GLASS },   // ouest
];

// Débris déblayables (touche E) : bloquent tout le monde tant qu'ils sont là.
export const DEBRIS: DebrisDef[] = [
  { x: 1280, y: 700, w: 100, h: 28, color: RUBBLE, price: 750, label: 'Porte principale' },
  { x: 1580, y: 480, w: 28, h: 100, color: RUBBLE, price: 750, label: 'Mur effondré' },
];

// Points d'apparition des zombies : devant les vitraux + brèches du village
export const SPAWN_POINTS = [
  { x: 1120, y: 180 },             // devant vitrail nord-ouest
  { x: 1440, y: 180 },             // devant vitrail nord-est
  { x: 880, y: 470 },              // devant vitrail ouest
  { x: 1280, y: 60 },              // brèche nord — lisière de forêt
  { x: 1280, y: MAP_HEIGHT - 60 }, // brèche sud
  { x: 60, y: 720 },               // ruelle ouest
  { x: MAP_WIDTH - 60, y: 720 },   // ruelle est
];

export const SPAWN_JITTER = 40; // dispersion aléatoire autour du point
