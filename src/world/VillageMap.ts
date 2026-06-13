import Phaser from 'phaser';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  WALLS,
  VITRAUX,
  DEBRIS,
  WEAPON_SPOTS,
  FORGE_SPOT,
  DebrisDef,
  WeaponSpotDef,
} from '../config/map.config';
import { WEAPONS, WeaponDef } from '../config/weapons.config';

export interface DebrisObject {
  rect: Phaser.GameObjects.Rectangle;
  def: DebrisDef;
  cleared: boolean;
}

export interface WeaponSpot {
  spot: WeaponSpotDef;
  weapon: WeaponDef;
}

/**
 * Construit le village placeholder : sol, murs, vitraux, débris déblayables.
 * - obstacles : bloquent joueur, zombies et balles
 * - vitraux : bloquent uniquement le joueur (zombies et balles passent)
 * - debris : bloquent tout, déblayables contre des points (touche E)
 */
export class VillageMap {
  public obstacles: Phaser.GameObjects.Rectangle[] = [];
  public vitraux: Phaser.GameObjects.Rectangle[] = [];
  public debris: DebrisObject[] = [];
  public weaponSpots: WeaponSpot[] = [];

  constructor(scene: Phaser.Scene) {
    // Sol (neige sale)
    scene.add
      .rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x23211e)
      .setDepth(0);

    // Routes (décor, sans collision) — suivent la boucle des zones
    scene.add.rectangle(1104, 1150, 130, 700, 0x2b2926).setDepth(0);   // place → porte rue
    scene.add.rectangle(1376, 1936, 2112, 130, 0x2b2926).setDepth(0);  // rue principale
    scene.add.rectangle(2496, 2050, 130, 400, 0x2b2926).setDepth(0);   // rue → ferme
    scene.add.rectangle(3088, 1408, 130, 280, 0x2b2926).setDepth(0);   // ferme → forêt

    // Dalles de l'église (décor)
    scene.add.rectangle(1280, 530, 936, 696, 0x322e28).setDepth(0);

    // Murs et obstacles
    for (const def of WALLS) {
      const rect = scene.add.rectangle(def.x, def.y, def.w, def.h, def.color).setDepth(2);
      scene.physics.add.existing(rect, true);
      this.obstacles.push(rect);
    }

    // Vitraux brisés (bloquent le joueur uniquement)
    for (const def of VITRAUX) {
      const rect = scene.add
        .rectangle(def.x, def.y, def.w, def.h, def.color, 0.55)
        .setDepth(2);
      scene.physics.add.existing(rect, true);
      this.vitraux.push(rect);
    }

    // Débris déblayables
    for (const def of DEBRIS) {
      const rect = scene.add.rectangle(def.x, def.y, def.w, def.h, def.color).setDepth(2);
      scene.physics.add.existing(rect, true);
      this.debris.push({ rect, def, cleared: false });
    }

    // Forge du cimetière : enclume + gros marteau (décor, sans collision —
    // l'interaction d'amélioration est gérée par la scène)
    const fx = FORGE_SPOT.x;
    const fy = FORGE_SPOT.y;
    scene.add.rectangle(fx, fy + 18, 60, 16, 0x4a3728).setDepth(1);      // billot
    scene.add.rectangle(fx, fy, 54, 22, 0x2b2b2f).setDepth(2);          // corps de l'enclume
    scene.add.rectangle(fx + 18, fy - 8, 34, 12, 0x2b2b2f).setDepth(2); // bigorne (pointe)
    scene.add.rectangle(fx - 22, fy - 30, 8, 44, 0x6d4c2f).setDepth(2); // manche du marteau
    scene.add.rectangle(fx - 22, fy - 52, 26, 16, 0x3a3a40).setDepth(2);// tête du marteau

    // Caisses d'armes (décor, sans collision — l'interaction est gérée par la scène)
    for (const spot of WEAPON_SPOTS) {
      const weapon = WEAPONS[spot.weaponId];
      // Caisse en bois avec couvercle
      scene.add.rectangle(spot.x, spot.y, 30, 22, 0x7a5c3e).setDepth(1);
      scene.add.rectangle(spot.x, spot.y - 4, 30, 4, 0x9b7653).setDepth(1);
      this.weaponSpots.push({ spot, weapon });
    }
  }

  /** Déblaie un débris : retire le visuel et le corps physique. */
  clear(d: DebrisObject): void {
    d.cleared = true;
    d.rect.destroy();
  }
}
