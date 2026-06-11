import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, WALLS } from '../config/map.config';

/**
 * Construit le village placeholder : sol, obstacles avec corps statiques.
 * Les obstacles bloquent joueur, zombies et balles.
 */
export class VillageMap {
  /** Rectangles avec corps physiques statiques. */
  public obstacles: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    // Sol (neige sale)
    scene.add
      .rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x23211e)
      .setDepth(0);

    // Routes (décor, sans collision) : croix centrale entre les brèches
    scene.add.rectangle(1280, MAP_HEIGHT / 2, 120, MAP_HEIGHT, 0x2b2926).setDepth(0);
    scene.add.rectangle(MAP_WIDTH / 2, 720, MAP_WIDTH, 120, 0x2b2926).setDepth(0);

    // Obstacles
    for (const def of WALLS) {
      const rect = scene.add.rectangle(def.x, def.y, def.w, def.h, def.color).setDepth(2);
      scene.physics.add.existing(rect, true); // true = statique
      this.obstacles.push(rect);
    }
  }
}
