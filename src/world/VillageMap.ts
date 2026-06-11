import Phaser from 'phaser';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  WALLS,
  VITRAUX,
  DEBRIS,
  DebrisDef,
} from '../config/map.config';

export interface DebrisObject {
  rect: Phaser.GameObjects.Rectangle;
  def: DebrisDef;
  cleared: boolean;
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

  constructor(scene: Phaser.Scene) {
    // Sol (neige sale)
    scene.add
      .rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x23211e)
      .setDepth(0);

    // Routes (décor, sans collision)
    scene.add.rectangle(1280, MAP_HEIGHT / 2, 120, MAP_HEIGHT, 0x2b2926).setDepth(0);
    scene.add.rectangle(MAP_WIDTH / 2, 720, MAP_WIDTH, 120, 0x2b2926).setDepth(0);

    // Dalles de l'église (décor)
    scene.add.rectangle(1280, 480, 648, 488, 0x322e28).setDepth(0);

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
  }

  /** Déblaie un débris : retire le visuel et le corps physique. */
  clear(d: DebrisObject): void {
    d.cleared = true;
    d.rect.destroy();
  }
}
