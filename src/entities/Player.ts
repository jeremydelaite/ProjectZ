import Phaser from 'phaser';
import { Bullet } from './Bullet';
import { Stats, WeaponStats } from '../types';

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private stats: Stats = {
    hp: 100,
    maxHp: 100,
    speed: 200,
  };

  private weapon: WeaponStats = {
    damage: 15,
    fireRate: 400,
    bulletSpeed: 500,
    magazineSize: 8,
    currentAmmo: 8,
  };

  private lastFired: number = 0;
  private isDead: boolean = false;

  // Touches ZQSD (AZERTY)
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  public bullets: Bullet[] = [];

  // Visuel placeholder
  private body_rect: Phaser.GameObjects.Rectangle;
  private barrel: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Corps du joueur (carré vert foncé)
    this.body_rect = scene.add.rectangle(0, 0, 28, 28, 0x2e7d32);
    // Canon (rectangle qui pointe vers la droite par défaut)
    this.barrel = scene.add.rectangle(18, 0, 16, 6, 0x1b5e20);
    // Barre de vie (au dessus)
    this.hpBar = scene.add.graphics();

    this.add([this.body_rect, this.barrel, this.hpBar]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(28, 28);
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);

    // Input ZQSD
    this.keys = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = 32;
    const ratio = this.stats.hp / this.stats.maxHp;

    // Fond rouge
    this.hpBar.fillStyle(0x880000);
    this.hpBar.fillRect(-w / 2, -24, w, 4);

    // Barre verte
    this.hpBar.fillStyle(0x00e676);
    this.hpBar.fillRect(-w / 2, -24, w * ratio, 4);
  }

  update(time: number, delta: number, pointer: Phaser.Input.Pointer): void {
    if (this.isDead) return;

    this.handleMovement();
    this.handleRotation(pointer);
    this.handleShooting(time, pointer);
    this.updateBullets(delta);
  }

  private handleMovement(): void {
    const speed = this.stats.speed;
    this.body.setVelocity(0, 0);

    const left = this.keys.left.isDown;
    const right = this.keys.right.isDown;
    const up = this.keys.up.isDown;
    const down = this.keys.down.isDown;

    if (left) this.body.setVelocityX(-speed);
    else if (right) this.body.setVelocityX(speed);

    if (up) this.body.setVelocityY(-speed);
    else if (down) this.body.setVelocityY(speed);

    // Normaliser la diagonale
    if ((left || right) && (up || down)) {
      this.body.velocity.normalize().scale(speed);
    }
  }

  private handleRotation(pointer: Phaser.Input.Pointer): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    this.setRotation(angle);
  }

  private handleShooting(time: number, pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    if (time - this.lastFired < this.weapon.fireRate) return;
    if (this.weapon.currentAmmo <= 0) return;

    this.lastFired = time;
    this.weapon.currentAmmo--;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    const bullet = new Bullet(this.scene, this.x, this.y, this.weapon.damage);
    bullet.fire(angle, this.weapon.bulletSpeed);
    this.bullets.push(bullet);
  }

  private updateBullets(delta: number): void {
    this.bullets = this.bullets.filter(b => {
      if (!b.active) return false;
      b.update(delta);
      return b.active;
    });
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;

    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.drawHpBar();

    // Flash rouge
    this.scene.tweens.add({
      targets: this.body_rect,
      fillColor: 0xff1744,
      duration: 80,
      yoyo: true,
    });

    if (this.stats.hp <= 0) this.die();
  }

  private die(): void {
    this.isDead = true;
    this.scene.events.emit('playerDead');
  }

  getHp(): number { return this.stats.hp; }
  getMaxHp(): number { return this.stats.maxHp; }
  isAlive(): boolean { return !this.isDead; }
}
