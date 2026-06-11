import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
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

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private zombies: Zombie[] = [];
  private roundManager!: RoundManager;
  private gameOver: boolean = false;

  private points: number = 0;
  private kills: number = 0;
  private hudText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset (au cas où la scène est relancée)
    this.zombies = [];
    this.gameOver = false;
    this.points = 0;
    this.kills = 0;

    // Sol placeholder
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a)
      .setDepth(0);

    // Quelques obstacles placeholder pour tester le positionnement
    this.add.rectangle(400, 300, 80, 80, 0x333333).setDepth(1);
    this.add.rectangle(800, 400, 120, 40, 0x333333).setDepth(1);
    this.add.rectangle(600, 200, 40, 160, 0x333333).setDepth(1);

    // Joueur
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Camera
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

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
        .text(16, 16, 'ProjectZ — DEV | Clic gauche : tirer | ZQSD : bouger', {
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
  }

  /** Spawn un Fantassin sur un bord aléatoire, avec les PV de la manche en cours. */
  private spawnZombie(): void {
    if (this.gameOver) return;

    const margin = 20;
    const edge = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    switch (edge) {
      case 0: // haut
        x = Phaser.Math.Between(0, GAME_WIDTH);
        y = -margin;
        break;
      case 1: // bas
        x = Phaser.Math.Between(0, GAME_WIDTH);
        y = GAME_HEIGHT + margin;
        break;
      case 2: // gauche
        x = -margin;
        y = Phaser.Math.Between(0, GAME_HEIGHT);
        break;
      case 3: // droite
        x = GAME_WIDTH + margin;
        y = Phaser.Math.Between(0, GAME_HEIGHT);
        break;
    }

    const stats = {
      ...FANTASSIN_STATS,
      hp: fantassinHpForRound(this.roundManager.getRound()),
    };
    this.zombies.push(new Zombie(this, x, y, stats));
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
    this.hudText.setText(`Points : ${this.points}   Kills : ${this.kills}`);
  }

  private onPlayerDead(): void {
    this.gameOver = true;
    this.zombies.forEach(z => z.body && z.body.setVelocity(0, 0));

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
