// Map du village des Ardennes — Étape 5+6 : boucle + cimetière (forge).
// Placeholder : rectangles, en attendant les vrais assets.

export const MAP_WIDTH = 5248;
export const MAP_HEIGHT = 2880;

export const PLAYER_START = { x: 1280, y: 380 };

export interface RectDef { x: number; y: number; w: number; h: number; color: number; }
export interface DebrisDef extends RectDef {
  price: number; label: string; id?: string; sealed?: boolean; blockedMessage?: string;
}

const STONE = 0x3a3a3a; const CHURCH = 0x55504a; const RUIN = 0x4a4038; const WOOD = 0x5d4037;
const METAL = 0x37474f; const ALTAR = 0x8d8273; const GLASS = 0x5c6bc0; const RUBBLE = 0x6d5a43;
const BARN = 0x6e4a2e; const CABIN = 0x4e3b2a; const TREE = 0x223018; const GRAVE = 0x55524c; const STATUE = 0x8f8a80; const HAY = 0xb9962e;
const T = 32; const CT = 24;

export const WALLS: RectDef[] = [
  // VILLAGE A
  { x: 320, y: 768, w: T, h: 1408, color: STONE },
  { x: 2048, y: 224, w: T, h: 320, color: STONE },
  { x: 2048, y: 1024, w: T, h: 896, color: STONE },
  { x: 1184, y: 64, w: 1728, h: T, color: STONE },
  { x: 672, y: 1472, w: 704, h: T, color: STONE },
  { x: 1616, y: 1472, w: 864, h: T, color: STONE },
  { x: 911, y: 200, w: 162, h: CT, color: CHURCH },
  { x: 1280, y: 200, w: 384, h: CT, color: CHURCH },
  { x: 1649, y: 200, w: 162, h: CT, color: CHURCH },
  { x: 1023, y: 860, w: 386, h: CT, color: CHURCH },
  { x: 1537, y: 860, w: 386, h: CT, color: CHURCH },
  { x: 830, y: 340, w: CT, h: 280, color: CHURCH },
  { x: 830, y: 718, w: CT, h: 284, color: CHURCH },
  { x: 1730, y: 340, w: CT, h: 280, color: CHURCH },
  { x: 1730, y: 734, w: CT, h: 252, color: CHURCH },
  { x: 1280, y: 280, w: 200, h: 40, color: ALTAR },
  { x: 1080, y: 420, w: 44, h: 44, color: STONE },
  { x: 1480, y: 420, w: 44, h: 44, color: STONE },
  { x: 1080, y: 660, w: 44, h: 44, color: STONE },
  { x: 1480, y: 660, w: 44, h: 44, color: STONE },
  { x: 520, y: 1150, w: 180, h: 140, color: RUIN },
  { x: 1750, y: 1150, w: 180, h: 140, color: RUIN },
  { x: 470, y: 1360, w: 160, h: 120, color: RUIN },
  { x: 1820, y: 1360, w: 160, h: 120, color: RUIN },
  { x: 900, y: 1050, w: 60, h: 40, color: WOOD },
  { x: 1460, y: 1050, w: 60, h: 40, color: WOOD },
  { x: 1180, y: 1180, w: 80, h: 40, color: WOOD },
  { x: 700, y: 1320, w: 150, h: 80, color: METAL },
  // RUE B
  { x: 672, y: 1600, w: 704, h: T, color: STONE },
  { x: 1808, y: 1600, w: 1248, h: T, color: STONE },
  { x: 320, y: 1936, w: T, h: 672, color: STONE },
  { x: 1376, y: 2272, w: 2112, h: T, color: STONE },
  { x: 2432, y: 1728, w: T, h: 256, color: STONE },
  { x: 2432, y: 2144, w: T, h: 256, color: STONE },
  { x: 560, y: 1740, w: 200, h: 130, color: RUIN },
  { x: 1050, y: 1740, w: 200, h: 130, color: RUIN },
  { x: 700, y: 2130, w: 180, h: 120, color: RUIN },
  { x: 2150, y: 1760, w: 180, h: 140, color: RUIN },
  { x: 2150, y: 2120, w: 180, h: 130, color: RUIN },
  { x: 1500, y: 1700, w: 40, h: 130, color: WOOD },
  { x: 1500, y: 2180, w: 40, h: 150, color: WOOD },
  // FERME C
  { x: 2560, y: 1664, w: T, h: 384, color: STONE },
  { x: 2560, y: 2368, w: T, h: 704, color: STONE },
  { x: 2784, y: 1472, w: 448, h: T, color: STONE },
  { x: 3568, y: 1472, w: 800, h: T, color: STONE },
  { x: 3968, y: 2096, w: T, h: 1248, color: STONE },
  { x: 3264, y: 2720, w: 1408, h: T, color: STONE },
  // grange recentrée — le détonateur est caché dans la cache sous le plancher
  { x: 3230, y: 1700, w: 600, h: 24, color: BARN },
  { x: 2930, y: 1975, w: 24, h: 550, color: BARN },
  { x: 3530, y: 1975, w: 24, h: 550, color: BARN },
  { x: 3030, y: 2250, w: 200, h: 24, color: BARN },
  { x: 3430, y: 2250, w: 200, h: 24, color: BARN },
  // ballots de paille (remplissent la cour, enclos retiré)
  { x: 3720, y: 1720, w: 54, h: 34, color: HAY },
  { x: 3850, y: 1950, w: 54, h: 34, color: HAY },
  { x: 3700, y: 2150, w: 54, h: 34, color: HAY },
  { x: 2760, y: 2420, w: 54, h: 34, color: HAY },
  { x: 2950, y: 2520, w: 54, h: 34, color: HAY },
  { x: 3500, y: 2560, w: 54, h: 34, color: HAY },
  // FORET D
  { x: 2240, y: 224, w: T, h: 320, color: STONE },
  { x: 2240, y: 960, w: T, h: 768, color: STONE },
  { x: 2624, y: 64, w: 768, h: T, color: STONE },
  { x: 3600, y: 64, w: 864, h: T, color: STONE },
  { x: 4032, y: 352, w: T, h: 576, color: STONE },
  { x: 4032, y: 1072, w: T, h: 544, color: STONE },
  { x: 2624, y: 1344, w: 768, h: T, color: STONE },
  { x: 3600, y: 1344, w: 864, h: T, color: STONE },
  { x: 3400, y: 420, w: 260, h: 24, color: CABIN },
  { x: 3280, y: 520, w: 24, h: 200, color: CABIN },
  { x: 3520, y: 520, w: 24, h: 200, color: CABIN },
  { x: 3320, y: 620, w: 80, h: 24, color: CABIN },
  { x: 3480, y: 620, w: 80, h: 24, color: CABIN },
  { x: 2480, y: 260, w: 44, h: 44, color: TREE },
  { x: 2680, y: 460, w: 48, h: 48, color: TREE },
  { x: 2520, y: 700, w: 44, h: 44, color: TREE },
  { x: 2800, y: 900, w: 48, h: 48, color: TREE },
  { x: 2480, y: 1150, w: 44, h: 44, color: TREE },
  { x: 3000, y: 1180, w: 48, h: 48, color: TREE },
  { x: 3700, y: 300, w: 48, h: 48, color: TREE },
  { x: 3900, y: 560, w: 44, h: 44, color: TREE },
  { x: 3750, y: 920, w: 48, h: 48, color: TREE },
  { x: 3500, y: 1150, w: 44, h: 44, color: TREE },
  { x: 3300, y: 980, w: 48, h: 48, color: TREE },
  { x: 2950, y: 360, w: 44, h: 44, color: TREE },
  // CIMETIERE E
  { x: 4160, y: 416, w: T, h: 448, color: STONE },
  { x: 4160, y: 1024, w: T, h: 448, color: STONE },
  { x: 4624, y: 192, w: 928, h: T, color: STONE },
  { x: 5088, y: 416, w: T, h: 448, color: STONE },
  { x: 5088, y: 1024, w: T, h: 448, color: STONE },
  { x: 4624, y: 1248, w: 928, h: T, color: STONE },
  { x: 4624, y: 410, w: 60, h: 60, color: STATUE },
  { x: 4320, y: 320, w: 46, h: 30, color: GRAVE },
  { x: 4500, y: 320, w: 46, h: 30, color: GRAVE },
  { x: 4760, y: 320, w: 46, h: 30, color: GRAVE },
  { x: 4920, y: 320, w: 46, h: 30, color: GRAVE },
  { x: 4320, y: 560, w: 46, h: 30, color: GRAVE },
  { x: 4920, y: 560, w: 46, h: 30, color: GRAVE },
  { x: 4500, y: 980, w: 46, h: 30, color: GRAVE },
  { x: 4760, y: 980, w: 46, h: 30, color: GRAVE },
  { x: 4320, y: 1110, w: 46, h: 30, color: GRAVE },
  { x: 4500, y: 1110, w: 46, h: 30, color: GRAVE },
  { x: 4760, y: 1110, w: 46, h: 30, color: GRAVE },
  { x: 4920, y: 1110, w: 46, h: 30, color: GRAVE },
  // CONDAMNE : batiments du village entre les zones (seule la porte passe)
  { x: 672, y: 1536, w: 704, h: 128, color: RUIN },
  { x: 1808, y: 1536, w: 1248, h: 128, color: RUIN },
  { x: 2496, y: 1664, w: 128, h: 384, color: RUIN },
  { x: 2496, y: 2368, w: 128, h: 704, color: RUIN },
  { x: 2624, y: 1408, w: 768, h: 128, color: RUIN },
  { x: 3600, y: 1408, w: 864, h: 128, color: RUIN },
  { x: 4096, y: 352, w: 128, h: 576, color: RUIN },
  { x: 4096, y: 1072, w: 128, h: 544, color: RUIN },
  { x: 2144, y: 224, w: 192, h: 320, color: RUIN },
  { x: 2144, y: 1024, w: 192, h: 896, color: RUIN },
];

export const VITRAUX: RectDef[] = [
  { x: 1040, y: 200, w: 96, h: CT, color: GLASS },
  { x: 1520, y: 200, w: 96, h: CT, color: GLASS },
  { x: 830, y: 528, w: CT, h: 96, color: GLASS },
];

export const DEBRIS: DebrisDef[] = [
  { x: 1280, y: 860, w: 128, h: 28, color: RUBBLE, price: 750, label: 'Porte principale', id: 'eglise_sud' },
  { x: 1730, y: 544, w: 28, h: 128, color: RUBBLE, price: 750, label: 'Mur effondré', id: 'eglise_est' },
  { x: 1104, y: 1536, w: 160, h: 128, color: RUBBLE, price: 1250, label: 'Rue principale', id: 'porte_rue' },
  { x: 2496, y: 1936, w: 128, h: 160, color: RUBBLE, price: 2000, label: 'Entrée de la ferme', id: 'porte_ferme' },
  { x: 3088, y: 1408, w: 160, h: 128, color: RUBBLE, price: 3000, label: 'Lisière de la forêt', id: 'porte_foret' },
  { x: 4096, y: 720, w: 128, h: 160, color: RUBBLE, price: 2000, label: 'Grille du cimetière', id: 'porte_cimetiere' },
  { x: 2144, y: 480, w: 192, h: 192, color: RUBBLE, price: 0, label: 'Mur éboulé', id: 'gros_debris', sealed: true, blockedMessage: 'Mur éboulé infranchissable — il faudrait le faire sauter…' },
];

export interface WeaponSpotDef { x: number; y: number; weaponId: string; }
export const WEAPON_SPOTS: WeaponSpotDef[] = [
  { x: 1100, y: 290, weaponId: 'mas_40' },
  { x: 1500, y: 1950, weaponId: 'mas_38' },
  { x: 3780, y: 2350, weaponId: 'double_canon' },
  { x: 3400, y: 760, weaponId: 'fm_24_29' },
];

export const FORGE_SPOT = { x: 4624, y: 820 };

export const EGG = {
  explosifs: { x: 3400, y: 510, label: 'Explosifs (cabane de chasse)' },
  detonateur: { x: 3230, y: 2000, label: 'Détonateur (cache sous le plancher)' },
  charge: { x: 2240, y: 480, label: 'Poser les explosifs sur le mur éboulé' },
  debrisId: 'gros_debris',
};

export interface SpawnPointDef { x: number; y: number; type: 'ground' | 'edge'; }
export const SPAWN_POINTS: SpawnPointDef[] = [
  { x: 1040, y: 130, type: 'ground' },
  { x: 1520, y: 130, type: 'ground' },
  { x: 740, y: 528, type: 'ground' },
  { x: 560, y: 1250, type: 'ground' },
  { x: 1650, y: 1250, type: 'ground' },
  { x: 640, y: 1950, type: 'ground' },
  { x: 2100, y: 1980, type: 'ground' },
  { x: 3400, y: 2450, type: 'ground' },
  { x: 2750, y: 1900, type: 'ground' },
  { x: 2500, y: 300, type: 'ground' },
  { x: 2900, y: 1100, type: 'ground' },
  { x: 3820, y: 1060, type: 'ground' },
  { x: 4300, y: 1000, type: 'ground' },
  { x: 4900, y: 520, type: 'ground' },
  { x: 4624, y: 1120, type: 'ground' },
  { x: 3088, y: -40, type: 'edge' },
  { x: MAP_WIDTH + 40, y: 720, type: 'edge' },
];

export const SPAWN_JITTER = 40;
