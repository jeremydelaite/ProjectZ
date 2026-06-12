import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import {
  FANTASSIN_STATS,
  COUREUR_STATS,
  SS_STATS,
  GAZE_STATS,
  POISON_DPS,
} from '../config/zombies.config';
import { loadRecords } from '../systems/Records';

// Mise en page : 2 rangées (3 cartes / 2 cartes), centrées
const CARD_W = 370;
const CARD_H = 262;
const CARD_GAP = 32;
const ROW1_Y = 232;
const ROW2_Y = 520;

export class BestiaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BestiaryScene' });
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a)
      .setDepth(0);

    this.add
      .text(GAME_WIDTH / 2, 48, 'BESTIAIRE', {
        font: 'bold 38px monospace',
        color: '#ff1744',
      })
      .setOrigin(0.5);

    // Rangée 1 : Fantassin, Coureur, SS
    const row1X = this.rowX(3);
    this.card(row1X[0], ROW1_Y, 'LE FANTASSIN', '#aebd8e', [
      'Wehrmacht réanimée, en lambeaux.',
      '',
      `PV ${FANTASSIN_STATS.hp} · Vit ${FANTASSIN_STATS.speed} · Dég ${FANTASSIN_STATS.damage}`,
      '',
      'Manche 1+. La base de la horde,',
      'remplacé peu à peu par les SS.',
    ]);
    this.drawZombie(row1X[0] + CARD_W / 2, ROW1_Y - 75, 0x5c6b46, 0x3e4a30, 56);

    this.card(row1X[1], ROW1_Y, 'LE COUREUR', '#c8a878', [
      'Villageois fraîchement infecté.',
      '',
      `PV ${COUREUR_STATS.hp} · Vit ${COUREUR_STATS.speed} · Dég ${COUREUR_STATS.damage}`,
      '',
      'Manche 4+ (jusqu\'à 25 %).',
      'Il sprinte presque comme toi !',
    ]);
    this.drawZombie(row1X[1] + CARD_W / 2, ROW1_Y - 75, 0x9c8468, 0x4e342e, 40);

    this.card(row1X[2], ROW1_Y, 'LE SOLDAT SS', '#8a8a99', [
      'La relève. Discipliné, féroce.',
      '',
      `PV ${SS_STATS.hp} · Vit ${SS_STATS.speed} · Dég ${SS_STATS.damage}`,
      '',
      'Manche 6+, jusqu\'à 85 % des',
      'spawns dans les hautes manches.',
    ]);
    this.drawZombie(row1X[2] + CARD_W / 2, ROW1_Y - 75, 0x26262e, 0x111116, 56);

    // Rangée 2 : Gazé + profil
    const row2X = this.rowX(2);
    this.card(row2X[0], ROW2_Y, 'LE GAZÉ', '#76ff03', [
      'Victime des gaz, difforme.',
      '',
      `PV ${GAZE_STATS.hp} · Vit ${GAZE_STATS.speed}, erratique`,
      `Explose : nuage ${POISON_DPS} dég/s × 4 s`,
      '',
      'Manches 5, 10, 15… À TUER À',
      'DISTANCE — jamais au contact !',
    ]);
    this.drawGaze(row2X[0] + CARD_W / 2, ROW2_Y - 75);

    const r = loadRecords();
    this.card(row2X[1], ROW2_Y, 'LE SOLDAT — PROFIL', '#00e676', [
      'PV 80 · Régén 3 s → 35 PV/s',
      'Vitesse 200 (selon l\'arme)',
      '',
      '— ÉTATS DE SERVICE —',
      `Meilleure manche : ${r.bestRound} · Parties : ${r.games}`,
      `Kills : ${r.totalKills} · Points : ${r.totalPoints}`,
    ]);
    this.drawSoldier(row2X[1] + CARD_W / 2, ROW2_Y - 75);

    // Retour
    const back = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 32, '— ÉCHAP OU CLIC : RETOUR AU MENU —', {
        font: 'bold 17px monospace',
        color: '#ffdd00',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  /** Positions x (bord gauche) d'une rangée de n cartes centrée. */
  private rowX(n: number): number[] {
    const total = n * CARD_W + (n - 1) * CARD_GAP;
    const start = (GAME_WIDTH - total) / 2;
    return Array.from({ length: n }, (_, i) => start + i * (CARD_W + CARD_GAP));
  }

  private card(x: number, yCenter: number, title: string, color: string, lines: string[]): void {
    const g = this.add.graphics();
    g.fillStyle(0x161412);
    g.fillRect(x, yCenter - CARD_H / 2, CARD_W, CARD_H);
    g.lineStyle(2, 0x3a3a3a);
    g.strokeRect(x, yCenter - CARD_H / 2, CARD_W, CARD_H);

    this.add.text(x + 20, yCenter - 32, title, { font: 'bold 18px monospace', color });
    this.add.text(x + 20, yCenter - 2, lines.join('\n'), {
      font: '13px monospace',
      color: '#bdbdbd',
      lineSpacing: 4,
    });
  }

  /** Zombie générique ×2 : corps + casque/cheveux + yeux rouges. */
  private drawZombie(cx: number, cy: number, body: number, head: number, headW: number): void {
    this.add.rectangle(cx, cy, 52, 52, body);
    this.add.rectangle(cx, cy - 18, headW, 16, head);
    this.add.rectangle(cx - 10, cy - 2, 8, 8, 0xff1744);
    this.add.rectangle(cx + 10, cy - 2, 8, 8, 0xff1744);
  }

  private drawGaze(cx: number, cy: number): void {
    this.add.circle(cx, cy, 40, 0x76ff03, 0.18);
    this.add.rectangle(cx, cy, 52, 52, 0x86a45a);
    this.add.rectangle(cx + 8, cy - 18, 32, 16, 0x9bbf6a); // tête de travers
    this.add.rectangle(cx - 10, cy - 2, 8, 8, 0xff1744);
    this.add.rectangle(cx + 10, cy - 2, 8, 8, 0xff1744);
  }

  private drawSoldier(cx: number, cy: number): void {
    this.add.rectangle(cx, cy, 56, 56, 0x2e7d32);
    this.add.rectangle(cx + 36, cy, 32, 12, 0x1b5e20); // canon
  }
}
