import Phaser from 'phaser';

// Perforation : multiplicateurs de dégâts par cible traversée.
// 1re cible : 100 %, 2e : 75 %, 3e : 50 %, puis la balle s'arrête.
const PIERCE_MULTIPLIERS = [1, 0.75, 0.5];

export class Bullet extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;
  private lifespan: number; // ms avant autodestruction = portée
  private elapsed: number = 0;
  public damage: number;

  // Cibles déjà traversées (évite de toucher 2× le même zombie
  // pendant les frames où la balle le chevauche)
  private hitTargets = new Set<unknown>();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    damage: number,
    lifespan: number = 1200
  ) {
    super(scene, x, y, 6, 6, 0xffdd00);
    this.damage = damage;
    this.lifespan = lifespan;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(false);
    this.setDepth(20);
  }

  fire(angle: number, speed: number): void {
    this.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }

  /**
   * Enregistre l'impact sur une cible. Retourne les dégâts à infliger
   * (dégressifs selon le nombre de cibles déjà traversées), ou null si
   * cette cible a déjà été touchée par cette balle.
   * La balle se détruit après la dernière cible perforable.
   */
  registerHit(target: unknown): number | null {
    if (!this.active) return null;
    if (this.hitTargets.has(target)) return null;

    const index = this.hitTargets.size;
    if (index >= PIERCE_MULTIPLIERS.length) {
      this.destroy();
      return null;
    }

    this.hitTargets.add(target);
    const dmg = Math.round(this.damage * PIERCE_MULTIPLIERS[index]);

    if (this.hitTargets.size >= PIERCE_MULTIPLIERS.length) {
      this.destroy();
    }
    return dmg;
  }

  update(delta: number): void {
    this.elapsed += delta;
    if (this.elapsed >= this.lifespan) {
      this.destroy();
    }
  }
}
