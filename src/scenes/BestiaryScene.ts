import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import { FANTASSIN_STATS, COUREUR_STATS } from '../config/zombies.config';
import { loadRecords } from '../systems/Records';

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

    const cardW = 360;
    const cardH = 420;
    const y = 320;

    // --- Carte Fantassin ---
    this.drawCard(180, y, cardW, cardH);
    this.drawFantassin(180 + cardW / 2 - 40, 170);
    this.cardText(
      200,
      230,
      'LE FANTASSIN',
      '#aebd8e',
      [
        'Soldat de la Wehrmacht réanimé,',
        'uniforme en lambeaux.',
        '',
        `PV        : ${FANTASSIN_STATS.hp} (+10 %/manche)`,
        `Vitesse   : ${FANTASSIN_STATS.speed} — marche traînante`,
        `Dégâts    : ${FANTASSIN_STATS.damage} par coup`,
        '',
        'Apparition : manche 1',
        'Toujours majoritaire dans la horde.',
      ]
    );

    // --- Carte Coureur ---
    this.drawCard(560, y, cardW, cardH);
    this.drawCoureur(560 + cardW / 2 - 40, 170);
    this.cardText(
      580,
      230,
      'LE COUREUR',
      '#c8a878',
      [
        'Villageois fraîchement infecté,',
        'encore en tenue civile.',
        '',
        `PV        : ${COUREUR_STATS.hp} (70 % du Fantassin)`,
        `Vitesse   : ${COUREUR_STATS.speed} — il court !`,
        `Dégâts    : ${COUREUR_STATS.damage} par coup`,
        '',
        'Apparition : manche 4 (5 %),',
        'jusqu\'à 25 % des spawns. Priorité !',
      ]
    );

    // --- Carte de profil ---
    const records = loadRecords();
    this.drawCard(940, y, cardW, cardH);
    this.drawSoldier(940 + cardW / 2 - 40, 170);
    this.cardText(
      960,
      230,
      'LE SOLDAT — PROFIL',
      '#00e676',
      [
        'PV         : 80 (4 coups de Fantassin)',
        'Régén      : 3 s sans dégât → 35 PV/s',
        'Vitesse    : 200 (selon l\'arme portée)',
        'Armes      : MAS 1935A + 1 principale',
        '',
        '— ÉTATS DE SERVICE —',
        `Meilleure manche : ${records.bestRound}`,
        `Kills cumulés    : ${records.totalKills}`,
        `Points cumulés   : ${records.totalPoints}`,
        `Parties jouées   : ${records.games}`,
      ]
    );

    // Retour
    const back = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '— ÉCHAP OU CLIC : RETOUR AU MENU —', {
        font: 'bold 18px monospace',
        color: '#ffdd00',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: back, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private drawCard(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x161412);
    g.fillRect(x, y - h / 2, w, h);
    g.lineStyle(2, 0x3a3a3a);
    g.strokeRect(x, y - h / 2, w, h);
  }

  private drawFantassin(x: number, y: number): void {
    // Même look qu'en jeu, ×3
    this.add.rectangle(x, y, 78, 78, 0x5c6b46);
    this.add.rectangle(x, y - 27, 84, 24, 0x3e4a30);
    this.add.rectangle(x - 15, y - 3, 12, 12, 0xff1744);
    this.add.rectangle(x + 15, y - 3, 12, 12, 0xff1744);
  }

  private drawCoureur(x: number, y: number): void {
    this.add.rectangle(x, y, 78, 78, 0x9c8468);
    this.add.rectangle(x, y - 27, 60, 21, 0x4e342e);
    this.add.rectangle(x - 15, y - 3, 12, 12, 0xff1744);
    this.add.rectangle(x + 15, y - 3, 12, 12, 0xff1744);
  }

  private drawSoldier(x: number, y: number): void {
    this.add.rectangle(x, y, 84, 84, 0x2e7d32);
    this.add.rectangle(x + 54, y, 48, 18, 0x1b5e20); // canon
  }

  private cardText(x: number, y: number, title: string, color: string, lines: string[]): void {
    this.add.text(x, y, title, { font: 'bold 20px monospace', color });
    this.add.text(x, y + 36, lines.join('\n'), {
      font: '14px monospace',
      color: '#bdbdbd',
      lineSpacing: 6,
    });
  }
}
