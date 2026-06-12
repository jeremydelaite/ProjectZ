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
  private pathTarget = new Phaser.Math.Vector2(0, 0); // position du joueur au dernier calcul

  // Anti-enlisement
  private lastPos = new Phaser.Math.Vector2(0, 0);
  private stuckMs: number = 0;

  // Sortie de terre : touchable mais inactif jusqu'à cette date
  private emergeUntil: number = 0;
  private hole?: Phaser.GameObjects.Ellipse;

  // Visuel placeholder (même style que Player)
  private body_rect: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: ZombieStats = FANTASSIN_STATS,
    pathfinder?: Pathfinder,
    emergeMs: number = 0
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

    // Sortie de terre : trou sombre + le zombie s'extrait progressivement
    if (emergeMs > 0) {
      this.emergeUntil = scene.time.now + emergeMs;
      this.hole = scene.add.ellipse(x, y + 8, 36, 18, 0x100e0c).setDepth(4);
      this.setScale(0.35);
      this.setAlpha(0.5);
      scene.tweens.add({
        targets: this,
        scale: 1,
        alpha: 1,
        duration: emergeMs,
        ease: 'Sine.easeOut',
      });
    }
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

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    // En train de sortir du sol : touchable mais inerte
    if (time < this.emergeUntil) {
      this.body.setVelocity(0, 0);
      return;
    }
    if (this.hole) {
      const hole = this.hole;
      this.hole = undefined;
      this.scene.tweens.add({
        targets: hole,
        alpha: 0,
        duration: 600,
        onComplete: () => hole.destroy(),
      });
    }

    if (!player.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    // 1) Choix de la cible : ligne droite si la voie est dégagée pour tout
    //    le corps, sinon chemin A* (détour le plus court, ex. via un vitrail).
    let targetX = player.x;
    let targetY = player.y;
    let hasTarget = true;

    const directSight =
      !this.pathfinder ||
      this.pathfinder.hasLineOfSight(this.x, this.y, player.x, player.y, LOS_RADIUS);

    if (!directSight && this.pathfinder) {
      const playerMoved =
        Phaser.Math.Distance.Between(player.x, player.y, this.pathTarget.x, this.pathTarget.y) > 64;

      if (time >= this.nextRepath || (playerMoved && this.path.length === 0)) {
        // Repath étalé dans le temps pour lisser la charge CPU
        this.nextRepath = time + 400 + Math.random() * 400;
        this.path = this.pathfinder.findPath(this.x, this.y, player.x, player.y) ?? [];
        this.pathTarget.set(player.x, player.y);
      }

      // Avancer dans le chemin : points atteints, et raccourcis à vue (épaisse)
      while (
        this.path.length > 0 &&
        Phaser.Math.Distance.Between(this.x, this.y, this.path[0].x, this.path[0].y) < 14
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
      } else {
        // Aucun chemin valide : on NE presse PAS l'obstacle. On s'arrête
        // et on retentera un calcul très vite.
        hasTarget = false;
        this.nextRepath = Math.min(this.nextRepath, time + 250);
      }
    } else {
      this.path = [];
    }

    // 2) Vélocité désirée, avec virage lissé (pas de demi-tour sec)
    let desiredX = 0;
    let desiredY = 0;
    if (hasTarget) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
      desiredX = Math.cos(angle) * this.stats.speed;
      desiredY = Math.sin(angle) * this.stats.speed;
    }
    const t = Math.min(1, delta / 120); // constante de lissage
    this.body.setVelocity(
      this.body.velocity.x + (desiredX - this.body.velocity.x) * t,
      this.body.velocity.y + (desiredY - this.body.velocity.y) * t
    );

    // 3) Bloqué contre un mur : repath rapide + glissement le long
    const blocked = this.body.blocked;
    if (blocked.left || blocked.right || blocked.up || blocked.down) {
      this.nextRepath = Math.min(this.nextRepath, time + 50 + Math.random() * 100);
      if (blocked.left || blocked.right) {
        const dirY = Math.sign(targetY - this.y) || 1;
        this.body.setVelocity(0, dirY * this.stats.speed);
      } else {
        const dirX = Math.sign(targetX - this.x) || 1;
        this.body.setVelocity(dirX * this.stats.speed, 0);
      }
    }

    // 4) Anti-enlisement : si on n'a presque pas bougé depuis ~600 ms alors
    //    qu'on devrait avancer, on jette le chemin et on recalcule tout de suite
    if (hasTarget) {
      const moved = Phaser.Math.Distance.Between(this.x, this.y, this.lastPos.x, this.lastPos.y);
      const expected = (this.stats.speed * delta) / 1000;
      if (moved < expected * 0.25) {
        this.stuckMs += delta;
      } else {
        this.stuckMs = 0;
      }
      if (this.stuckMs > 600) {
        this.stuckMs = 0;
        this.path = [];
        this.nextRepath = 0;
        // Petite impulsion latérale pour se décoller du coin
        const a = Math.atan2(targetY - this.y, targetX - this.x) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        this.body.setVelocity(Math.cos(a) * this.stats.speed, Math.sin(a) * this.stats.speed);
      }
    }
    this.lastPos.set(this.x, this.y);
  }

  /** Encore en train de sortir de son trou ? */
  isEmerging(): boolean {
    return this.scene.time.now < this.emergeUntil;
  }

  /** Appelé par la scène quand le zombie touche le joueur. */
  tryAttack(player: Player, time: number): void {
    if (this.isDead) return;
    if (this.isEmerging()) return;
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
    if (this.hole) {
      this.hole.destroy();
      this.hole = undefined;
    }
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
