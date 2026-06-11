import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_START,
  SPAWN_POINTS,
  SPAWN_JITTER,
  WALLS,
} from '../config/map.config';
import {
  FANTASSIN_STATS,
  POINTS_PER_HIT,
  POINTS_PER_KILL,
  fantassinHpForRound,
} from '../config/zombies.config';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';
import { RoundManager } from '../systems/RoundManager';
import { Pathfinder } from '../systems/Pathfinding';
import { VillageMap, DebrisObject } from '../world/VillageMap';

const INTERACT_RANGE = 90; // distance pour interagir avec les débris

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private zombies: Zombie[] = [];
  private map!: VillageMap;
  private pathfinder!: Pathfinder;
  private roundManager!: RoundManager;
  private gameOver: boolean = false;

  private points: number = 0;
  private kills: number = 0;
  private hudText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private keyInteract!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset (au cas où la scène est relancée)
    this.zombies = [];
    this.gameOver = false;
    this.points = 0;
    this.kills = 0;

    // Map du village + grille de pathfinding
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.map = new VillageMap(this);

    this.pathfinder = new Pathfinder(MAP_WIDTH, MAP_HEIGHT, 32);
    for (const def of WALLS) {
      this.pathfinder.addObstacleRect(def.x, def.y, def.w, def.h);
    }
    for (const d of this.map.debris) {
      this.pathfinder.addObstacleRect(d.def.x, d.def.y, d.def.w, d.def.h);
    }

    // Joueur — devant l'autel de l'église
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player, this.map.obstacles);
    this.physics.add.collider(this.player, this.map.vitraux);

    // Camera
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Interaction (déblayer les débris)
    this.keyInteract = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.promptText = this.add
      .text(0, 0, '', {
        font: 'bold 14px monospace',
        color: '#ffdd00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(150)
      .setVisible(false);

    // HUD
    this.hudText = this.add
      .text(16, GAME_HEIGHT - 32, '', {
        font: 'bold 16px monospace',
        color: '#ffdd00',
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.roundText = this.add
      .text(GAME_WIDTH - 16, 16, '', {
        font: 'bold 22px monospace',
        color: '#ff1744',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.updateHud();

    // Événements
    this.events.on('playerDead', this.onPlayerDead, this);
    this.events.on('zombieHit', this.onZombieHit, this);
    this.events.on('zombieKilled', this.onZombieKilled, this);
    this.events.on('roundStarted', this.onRoundStarted, this);
    this.events.on('roundEnded', this.onRoundEnded, this);

    // Manches
    this.roundManager = new RoundManager(
      this,
      () => this.spawnZombie(),
      () => this.zombies.filter(z => z.active && z.isAlive()).length
    );
    this.roundManager.start();

    // Debug
    if (import.meta.env.DEV) {
      this.add
        .text(16, 16, 'ProjectZ — DEV | Clic : tirer | ZQSD : bouger | R : recharger | E : déblayer', {
          font: '13px monospace',
          color: '#666666',
        })
        .setScrollFactor(0)
        .setDepth(100);
    }
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    const pointer = this.input.activePointer;
    this.player.update(time, delta, pointer);
    this.updateHud();

    this.roundManager.update(time, delta);

    // Purge des zombies détruits + update
    this.zombies = this.zombies.filter(z => z.active);
    this.zombies.forEach(z => z.update(time, delta, this.player));

    // Balles → zombies
    this.physics.overlap(
      this.player.bullets,
      this.zombies,
      (bullet, zombie) => {
        const b = bullet as Bullet;
        const z = zombie as Zombie;
        if (!z.isAlive()) return;
        z.takeDamage(b.damage);
        b.destroy();
      }
    );

    // Zombies → joueur (attaque au contact, avec cooldown)
    this.physics.overlap(this.player, this.zombies, (_player, zombie) => {
      (zombie as Zombie).tryAttack(this.player, time);
    });

    // Les zombies ne s'empilent pas
    this.physics.collide(this.zombies, this.zombies);

    // Murs : bloquent les zombies, arrêtent les balles
    // (les vitraux ne bloquent ni les zombies ni les balles)
    this.physics.collide(this.zombies, this.map.obstacles);
    this.physics.overlap(this.player.bullets, this.map.obstacles, bullet => {
      (bullet as Bullet).destroy();
    });

    // Débris encore en place : bloquent tout
    const activeDebris = this.map.debris.filter(d => !d.cleared).map(d => d.rect);
    if (activeDebris.length > 0) {
      this.physics.collide(this.player, activeDebris);
      this.physics.collide(this.zombies, activeDebris);
      this.physics.overlap(this.player.bullets, activeDebris, bullet => {
        (bullet as Bullet).destroy();
      });
    }

    this.handleDebrisInteraction();
  }

  /** Affiche le prompt près d'un débris et gère le déblaiement (touche E). */
  private handleDebrisInteraction(): void {
    let nearest: DebrisObject | null = null;
    let nearestDist = INTERACT_RANGE;

    for (const d of this.map.debris) {
      if (d.cleared) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        d.def.x,
        d.def.y
      );
      if (dist < nearestDist) {
        nearest = d;
        nearestDist = dist;
      }
    }

    if (!nearest) {
      this.promptText.setVisible(false);
      return;
    }

    this.promptText
      .setText(`E — Déblayer : ${nearest.def.label} (${nearest.def.price} pts)`)
      .setPosition(nearest.def.x, nearest.def.y - nearest.def.h / 2 - 12)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.keyInteract)) {
      if (this.points >= nearest.def.price) {
        this.points -= nearest.def.price;
        this.map.clear(nearest);
        // Le passage s'ouvre aussi pour le pathfinding des zombies
        this.pathfinder.removeObstacleRect(
          nearest.def.x,
          nearest.def.y,
          nearest.def.w,
          nearest.def.h
        );
        this.promptText.setVisible(false);
        this.updateHud();
      } else {
        // Pas assez de points : flash rouge
        this.promptText.setColor('#ff1744');
        this.time.delayedCall(300, () => this.promptText.setColor('#ffdd00'));
      }
    }
  }

  /** Spawn un Fantassin à un point d'apparition aléatoire. */
  private spawnZombie(): void {
    if (this.gameOver) return;

    const point = Phaser.Math.RND.pick(SPAWN_POINTS);
    const x = point.x + Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
    const y = point.y + Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);

    const stats = {
      ...FANTASSIN_STATS,
      hp: fantassinHpForRound(this.roundManager.getRound()),
    };
    this.zombies.push(new Zombie(this, x, y, stats, this.pathfinder));
  }

  private onRoundStarted(round: number): void {
    this.roundText.setText(`Manche ${round}`);

    // Annonce centrale qui s'estompe
    const announce = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, `— MANCHE ${round} —`, {
        font: 'bold 48px monospace',
        color: '#ff1744',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);

    this.tweens.add({
      targets: announce,
      alpha: 1,
      duration: 400,
      hold: 1200,
      yoyo: true,
      onComplete: () => announce.destroy(),
    });
  }

  private onRoundEnded(round: number): void {
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, `Manche ${round} terminée`, {
        font: 'bold 28px monospace',
        color: '#9e9e9e',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 1500,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  private onZombieHit(): void {
    this.points += POINTS_PER_HIT;
    this.updateHud();
  }

  private onZombieKilled(): void {
    this.points += POINTS_PER_KILL;
    this.kills++;
    this.updateHud();
  }

  private updateHud(): void {
    const ammo = this.player.isReloadingNow()
      ? 'RECHARGE…'
      : `${this.player.getAmmo()}/${this.player.getMagazineSize()}`;
    const text = `Points : ${this.points}   Kills : ${this.kills}   Pistolet : ${ammo}`;
    if (this.hudText.text !== text) this.hudText.setText(text);
  }

  private onPlayerDead(): void {
    this.gameOver = true;
    this.zombies.forEach(z => z.body && z.body.setVelocity(0, 0));
    this.promptText.setVisible(false);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        `GAME OVER\n\nManche ${this.roundManager.getRound()} — ${this.kills} kills — ${this.points} points`,
        {
          font: 'bold 40px monospace',
          color: '#ff1744',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }
}
