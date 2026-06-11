import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import { Player } from '../entities/Player';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private gameOver: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
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

    // Game Over
    this.events.on('playerDead', this.onPlayerDead, this);

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
  }

  private onPlayerDead(): void {
    this.gameOver = true;

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
