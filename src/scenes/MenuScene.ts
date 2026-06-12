import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a)
      .setDepth(0);

    // Titre
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3 - 20, 'PROJECT Z', {
        font: 'bold 84px monospace',
        color: '#ff1744',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3 + 50, 'Ardennes, hiver 1944', {
        font: '20px monospace',
        color: '#9e9e9e',
      })
      .setOrigin(0.5);

    // Contrôles
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 60,
        [
          'ZQSD — se déplacer',
          'Souris — viser · Clic — tirer',
          'R — recharger · A — changer d\'arme',
          'E — acheter / déblayer',
          'Échap — pause',
        ].join('\n'),
        {
          font: '16px monospace',
          color: '#bdbdbd',
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    // Appel à l'action (clignote)
    const start = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, '— CLIQUE POUR COMMENCER —', {
        font: 'bold 22px monospace',
        color: '#ffdd00',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: start,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
  }
}
