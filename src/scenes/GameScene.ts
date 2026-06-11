import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import {
  POINTS_PER_HIT,
  POINTS_PER_KILL,
  TEST_SPAWN_DELAY,
  MAX_ZOMBIES_ON_SCREEN,
} from '../config/zombies.config';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private zombies: Zombie[] = [];
  private spawnTimer!: Phaser.Time.TimerEvent;
  private gameOver: boolean = false;

  private points: number = 0;
  private kills: number = 0;
  private hudText!: Phaser.GameObjects.Text;

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

    // Spawner de test — sera remplacé par le système de manches
    this.spawnTimer = this.time.addEvent({
      delay: TEST_SPAWN_DELAY,
      loop: true,
      callback: this.spawnZombie,
      callbackScope: this,
    });

    // HUD points
    this.hudText = this.add
      .text(16, GAME_HEIGHT - 32, '', {
        font: 'bold 16px monospace',
        color: '#ffdd00',
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.updateHud();

    // Événements
    this.events.on('playerDead', this.onPlayerDead, this);
    this.events.on('zombieHit', this.onZombieHit, this);
    this.events.on('zombieKilled', this.onZombieKilled, this);

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

  /** Spawn un Fantassin sur un bord aléatoire de la map. */
  private spawnZombie(): void {
    if (this.gameOver) return;
    if (this.zombies.length >= MAX_ZOMBIES_ON_SCREEN) return;

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

    this.zombies.push(new Zombie(this, x, y));
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
    this.spawnTimer.remove();
    this.zombies.forEach(z => z.body && z.body.setVelocity(0, 0));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
        font: 'bold 64px monospace',
        color: '#ff1744',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }
}
