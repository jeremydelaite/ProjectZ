import Phaser from 'phaser';

export class Bullet extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;
  private lifespan: number = 1200; // ms avant autodestruction
  private elapsed: number = 0;
  public damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number) {
    super(scene, x, y, 6, 6, 0xffdd00);
    this.damage = damage;

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

  update(delta: number): void {
    this.elapsed += delta;
    if (this.elapsed >= this.lifespan) {
      this.destroy();
    }
  }
}
