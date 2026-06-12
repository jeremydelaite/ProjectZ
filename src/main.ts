import Phaser from 'phaser';
import { gameConfig } from './config/game.config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BestiaryScene } from './scenes/BestiaryScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, MenuScene, BestiaryScene, GameScene],
};

new Phaser.Game(config);
