import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import { FANTASSIN_STATS, COUREUR_STATS } from '../config/zombies.config';
import { loadRecords } from '../systems/Records';

// Mise en page : 3 cartes centrées avec gouttières
const CARD_W = 370;
const CARD_H = 430;
const CARD_GAP = 35;
const CARDS_Y = 330; // centre vertical des cartes

export class BestiaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BestiaryScene' });
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a)
      .setDepth(0);

    this.add
      .text(GAME_WIDTH / 2, 56, 'BESTIAIRE', {
        font: 'bold 44px monospace',
        color: '#ff1744',
      })
      .setOrigin(0.5);

    // 3 cartes : positions x du bord gauche, centrées dans l'écran
    const totalW = 3 * CARD_W + 2 * CARD_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardX = [startX, startX + CARD_W + CARD_GAP, startX + 2 * (CARD_W + CARD_GAP)];
    const centers = cardX.map(x => x + CARD_W / 2);

    // --- Carte Fantassin ---
    this.drawCard(cardX[0]);
    this.drawFantassin(centers[0], 185);
    this.cardText(cardX[0], 'LE FANTASSIN', '#aebd8e', [
      'Soldat de la Wehrmacht',
      'réanimé, uniforme en lambeaux.',
      '',
      `PV      : ${FANTASSIN_STATS.hp} (+10 %/manche)`,
      `Vitesse : ${FANTASSIN_STATS.speed} — marche traînante`,
      `Dégâts  : ${FANTASSIN_STATS.damage} par coup`,
      '',
      'Apparition : manche 1.',
      'Toujours majoritaire.',
    ]);

    // --- Carte Coureur ---
    this.drawCard(cardX[1]);
    this.drawCoureur(centers[1], 185);
    this.cardText(cardX[1], 'LE COUREUR', '#c8a878', [
      'Villageois fraîchement',
      'infecté, en tenue civile.',
      '',
      `PV      : ${COUREUR_STATS.hp} (70 % du Fantassin)`,
      `Vitesse : ${COUREUR_STATS.speed} — il court !`,
      `Dégâts  : ${COUREUR_STATS.damage} par coup`,
      '',
      'Apparition : manche 4 (5 %),',
      'jusqu\'à 25 % des spawns.',
    ]);

    // --- Carte de profil ---
    const records = loadRecords();
    this.drawCard(cardX[2]);
    this.drawSoldier(centers[2], 185);
    this.cardText(cardX[2], 'LE SOLDAT — PROFIL', '#00e676', [
      'PV      : 80 (4 coups)',
      'Régén   : 3 s → 35 PV/s',
      'Vitesse : 200 (selon l\'arme)',
      'Armes   : MAS 1935A + 1',
      '',
      '— ÉTATS DE SERVICE —',
      `Meilleure manche : ${records.bestRound}`,
      `Kills cumulés    : ${records.totalKills}`,
      `Points cumulés   : ${records.totalPoints}`,
      `Parties jouées   : ${records.games}`,
    ]);

    // Retour
    const back = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '— ÉCHAP OU CLIC : RETOUR AU MENU —', {
        font: 'bold 18px monospace',
        color: '#ffdd00',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private drawCard(x: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x161412);
    g.fillRect(x, CARDS_Y - CARD_H / 2, CARD_W, CARD_H);
    g.lineStyle(2, 0x3a3a3a);
    g.strokeRect(x, CARDS_Y - CARD_H / 2, CARD_W, CARD_H);
  }

  private drawFantassin(cx: number, cy: number): void {
    // Même look qu'en jeu, ×3
    this.add.rectangle(cx, cy, 78, 78, 0x5c6b46);
    this.add.rectangle(cx, cy - 27, 84, 24, 0x3e4a30);
    this.add.rectangle(cx - 15, cy - 3, 12, 12, 0xff1744);
    this.add.rectangle(cx + 15, cy - 3, 12, 12, 0xff1744);
  }

  private drawCoureur(cx: number, cy: number): void {
    this.add.rectangle(cx, cy, 78, 78, 0x9c8468);
    this.add.rectangle(cx, cy - 27, 60, 21, 0x4e342e);
    this.add.rectangle(cx - 15, cy - 3, 12, 12, 0xff1744);
    this.add.rectangle(cx + 15, cy - 3, 12, 12, 0xff1744);
  }

  private drawSoldier(cx: number, cy: number): void {
    this.add.rectangle(cx, cy, 84, 84, 0x2e7d32);
    this.add.rectangle(cx + 54, cy, 48, 18, 0x1b5e20); // canon
  }

  private cardText(cardX: number, title: string, color: string, lines: string[]): void {
    const x = cardX + 22;
    this.add.text(x, 252, title, { font: 'bold 19px monospace', color });
    this.add.text(x, 288, lines.join('\n'), {
      font: '14px monospace',
      color: '#bdbdbd',
      lineSpacing: 6,
    });
  }
}
