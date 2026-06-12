import Phaser from 'phaser';
import { ZombieStats } from '../types';
import { FANTASSIN_STATS } from '../config/zombies.config';
import { Player } from './Player';
import { Pathfinder } from '../systems/Pathfinding';

// Demi-largeur utilisée pour la ligne de vue : le zombie ne prend un raccourci
// que si son corps entier passe sans accrocher un coin de mur.
const LOS_RADIUS = 14;

export class Zombie extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private stats: ZombieStats;
  private hp: number;
  private maxHp: number;
  private lastAttack: number = 0;
  private isDead: boolean = false;

  // Pathfinding
  private pathfinder?: Pathfinder;
  private path: Phaser.Math.Vector2[] = [];
  private nextRepath: number = 0;

  // Visuel placeholder (même style que Player)
  private body_rect: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: ZombieStats = FANTASSIN_STATS,
    pathfinder?: Pathfinder
  ) {
    super(scene, x, y);

    this.stats = stats;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.pathfinder = pathfinder;

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

    // Sur un Container, le corps est ancré sur l'origine : il faut le recentrer
    this.body.setSize(24, 24);
    this.body.setOffset(-12, -12);
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

  update(time: number, _delta: number, player: Player): void {
    if (this.isDead) return;

    if (!player.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    // Cible : le joueur en ligne droite si rien ne gêne, sinon le prochain
    // point du chemin A*.
    let targetX = player.x;
    let targetY = player.y;

    if (
      this.pathfinder &&
      !this.pathfinder.hasLineOfSight(this.x, this.y, player.x, player.y, LOS_RADIUS)
    ) {
      if (time >= this.nextRepath) {
        // Repath étalé dans le temps pour lisser la charge CPU
        this.nextRepath = time + 400 + Math.random() * 400;
        this.path = this.pathfinder.findPath(this.x, this.y, player.x, player.y) ?? [];
      }

      // Avancer dans le chemin : points atteints, et raccourcis à vue (épaisse)
      while (
        this.path.length > 0 &&
        Phaser.Math.Distance.Between(this.x, this.y, this.path[0].x, this.path[0].y) < 12
      ) {
        this.path.shift();
      }
      if (
        this.path.length > 1 &&
        this.pathfinder.hasLineOfSight(this.x, this.y, this.path[1].x, this.path[1].y, LOS_RADIUS)
      ) {
        this.path.shift();
      }

      if (this.path.length > 0) {
        targetX = this.path[0].x;
        targetY = this.path[0].y;
      }
    } else {
      this.path = [];
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.body.setVelocity(
      Math.cos(angle) * this.stats.speed,
      Math.sin(angle) * this.stats.speed
    );

    // Filet de sécurité : si malgré tout bloqué contre un mur, glisser le long
    // et recalculer un chemin immédiatement (au lieu d'attendre le prochain repath)
    const blocked = this.body.blocked;
    if (blocked.left || blocked.right || blocked.up || blocked.down) {
      this.nextRepath = Math.min(this.nextRepath, time + 50 + Math.random() * 100);
    }
    if (blocked.left || blocked.right) {
      const dirY = Math.sign(targetY - this.y) || 1;
      this.body.setVelocity(0, dirY * this.stats.speed);
    } else if (blocked.up || blocked.down) {
      const dirX = Math.sign(targetX - this.x) || 1;
      this.body.setVelocity(dirX * this.stats.speed, 0);
    }
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
