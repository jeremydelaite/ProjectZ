import Phaser from 'phaser';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  WALLS,
  VITRAUX,
  DEBRIS,
  WEAPON_SPOTS,
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

    // Routes (décor, sans collision)
    scene.add.rectangle(1280, MAP_HEIGHT / 2, 120, MAP_HEIGHT, 0x2b2926).setDepth(0);
    scene.add.rectangle(MAP_WIDTH / 2, 720, MAP_WIDTH, 120, 0x2b2926).setDepth(0);

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
