// Arsenal français WW2 — Issue #3
// Achat sur des emplacements thématiques du village (pas de wall-buy COD).

export interface WeaponDef {
  id: string;
  name: string;
  category: string;       // lisible par tous : « Mitraillette », « Fusil-mitrailleur »…
  speedMultiplier: number; // vitesse de déplacement en portant l'arme (1 = normale)
  damage: number;         // dégâts par balle / par plomb
  fireRate: number;       // ms entre deux tirs
  bulletSpeed: number;
  bulletLifespan: number; // ms de vol = portée
  magazineSize: number;
  reloadTime: number;     // ms
  auto: boolean;          // true = tir maintenu, false = un clic par tir
  pellets: number;        // 1 = balle unique, >1 = gerbe (fusil de chasse)
  spreadDeg: number;      // dispersion totale de la gerbe en degrés
  price: number;          // points (0 = arme de départ)
  reserveMagazines: number; // chargeurs en réserve quand pleine (-1 = illimité)
}

// Racheter une réserve complète de chargeurs à la caisse de l'arme
export const AMMO_REFILL_PRICE = 500;

// --- Forge (enclume du cimetière) : amélioration d'arme ---
export const UPGRADE_PRICE = 5000;           // coût de l'amélioration
export const UPGRADE_DAMAGE_MULT = 2;        // ×2 dégâts
export const UPGRADE_MAG_MULT = 2;           // ×2 taille du chargeur
// Une arme améliorée coûte beaucoup plus cher à réapprovisionner (style Pack-a-Punch)
export const UPGRADED_AMMO_REFILL_PRICE = 5000;

export const WEAPONS: Record<string, WeaponDef> = {
  mas_1935a: {
    id: 'mas_1935a', name: 'MAS 1935A', category: 'Pistolet',
    speedMultiplier: 1, damage: 15, fireRate: 400, bulletSpeed: 500, bulletLifespan: 1200,
    magazineSize: 8, reloadTime: 1500, auto: false, pellets: 1, spreadDeg: 0, price: 0,
    reserveMagazines: -1,
  },
  double_canon: {
    id: 'double_canon', name: 'Double canon', category: 'Fusil de chasse',
    speedMultiplier: 0.95, damage: 10, fireRate: 600, bulletSpeed: 550, bulletLifespan: 320,
    magazineSize: 2, reloadTime: 2200, auto: false, pellets: 8, spreadDeg: 24, price: 750,
    reserveMagazines: 10,
  },
  mas_40: {
    id: 'mas_40', name: 'MAS 40', category: 'Fusil semi-auto',
    speedMultiplier: 0.92, damage: 50, fireRate: 500, bulletSpeed: 700, bulletLifespan: 1600,
    magazineSize: 10, reloadTime: 1700, auto: false, pellets: 1, spreadDeg: 0, price: 1200,
    reserveMagazines: 6,
  },
  mas_38: {
    id: 'mas_38', name: 'MAS 38', category: 'Mitraillette',
    speedMultiplier: 0.95, damage: 20, fireRate: 110, bulletSpeed: 550, bulletLifespan: 900,
    magazineSize: 32, reloadTime: 1900, auto: true, pellets: 1, spreadDeg: 0, price: 1500,
    reserveMagazines: 4,
  },
  fm_24_29: {
    id: 'fm_24_29', name: 'FM 24/29', category: 'Fusil-mitrailleur',
    speedMultiplier: 0.8, damage: 40, fireRate: 150, bulletSpeed: 650, bulletLifespan: 1600,
    magazineSize: 50, reloadTime: 2600, auto: true, pellets: 1, spreadDeg: 0, price: 3000,
    reserveMagazines: 4,
  },
};
