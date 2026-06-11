import Phaser from 'phaser';
import { ZombieStats } from '../types';
import { FANTASSIN_STATS } from '../config/zombies.config';
import { Player } from './Player';

export class Zombie extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private stats: ZombieStats;
  private hp: number;
  private maxHp: number;
  private lastAttack: number = 0;
  private isDead: boolean = false;

  // Visuel placeholder (même style que Player)
  private body_rect: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: ZombieStats = FANTASSIN_STATS) {
    super(scene, x, y);

    this.stats = stats;
    this.hp = stats.hp;
    this.maxHp = stats.hp;

    // Corps feldgrau (uniforme Wehrmacht en lambeaux)
    this.body_rect = scene.add.rectangle(0, 0, 26, 26, 0x5c6b46);
    // Casque
    const helmet = scene.add.rectangle(0, -9, 28, 8, 0x3e4a30);
    // Yeux rouges — lisibilité : c'est un ennemi
    const eyeL = scene.add.rectangle(-5, -1, 4, 4, 0xff1744);
    const eyeR = scene.add.rectangle(5, -1, 4, 4, 0xff1744);
    // Barre de vie
    this.hpBar = scene.add.graphics();

    this.add([this.body_rect, helmet, eyeL, eyeR, this.hpBar]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(26, 26);
    this.setDepth(5);

    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    if (this.hp >= this.maxHp) return; // visible seulement si blessé

    const w = 30;
    const ratio = this.hp / this.maxHp;

    this.hpBar.fillStyle(0x880000);
    this.hpBar.fillRect(-w / 2, -22, w, 3);
    this.hpBar.fillStyle(0xff5252);
    this.hpBar.fillRect(-w / 2, -22, w * ratio, 3);
  }

  update(_time: number, _delta: number, player: Player): void {
    if (this.isDead) return;

    if (!player.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    // Poursuite : marche traînante droit vers le joueur
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.body.setVelocity(
      Math.cos(angle) * this.stats.speed,
      Math.sin(angle) * this.stats.speed
    );
  }

  /** Appelé par la scène quand le zombie touche le joueur. */
  tryAttack(player: Player, time: number): void {
    if (this.isDead) return;
    if (time - this.lastAttack < this.stats.attackCooldown) return;

    this.lastAttack = time;
    player.takeDamage(this.stats.damage);
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;

    this.hp = Math.max(0, this.hp - amount);
    this.drawHpBar();
    this.scene.events.emit('zombieHit');

    // Flash blanc
    this.scene.tweens.add({
      targets: this.body_rect,
      fillColor: 0xffffff,
      duration: 60,
      yoyo: true,
    });

    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.isDead = true;
    this.body.enable = false;
    this.scene.events.emit('zombieKilled');

    // Petit fondu avant destruction
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }

  isAlive(): boolean {
    return !this.isDead;
  }
}
