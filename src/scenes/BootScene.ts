import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // assets loading here later
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
