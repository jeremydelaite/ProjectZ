import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private readonly PLAYER_SPEED = 200;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // --- Placeholder ground ---
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a)
      .setDepth(0);

    // --- Player placeholder ---
    this.player = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 32, 32, 0x4caf50)
      .setDepth(10);

    this.physics.add.existing(this.player);

    // --- Camera ---
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // --- Input ---
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // --- Debug label ---
    if (import.meta.env.DEV) {
      this.add
        .text(16, 16, 'ProjectZ — DEV', { font: '14px monospace', color: '#888888' })
        .setScrollFactor(0)
        .setDepth(100);
    }
  }

  update(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.PLAYER_SPEED;

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    body.setVelocity(0, 0);

    if (left) body.setVelocityX(-speed);
    else if (right) body.setVelocityX(speed);

    if (up) body.setVelocityY(-speed);
    else if (down) body.setVelocityY(speed);

    // Normalize diagonal movement
    if ((left || right) && (up || down)) {
      body.velocity.normalize().scale(speed);
    }
  }
}
