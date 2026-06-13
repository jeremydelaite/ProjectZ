import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_START,
  SPAWN_POINTS,
  SPAWN_JITTER,
  WALLS,
  FORGE_SPOT,
  EGG,
} from '../config/map.config';
import {
  FANTASSIN_STATS,
  COUREUR_STATS,
  SS_STATS,
  GAZE_STATS,
  POINTS_PER_HIT,
  POINTS_PER_KILL,
  DYNAMIC_SPAWN_CHANCE,
  POISON_DPS,
  POISON_DURATION,
  POISON_RADIUS,
  fantassinHpForRound,
  coureurHpForRound,
  coureurRatioForRound,
  ssHpForRound,
  ssRatioForRound,
  gazeHpForRound,
  isSpecialRound,
  AMMO_CRATE_MAX,
} from '../config/zombies.config';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';
import { RoundManager } from '../systems/RoundManager';
import { Pathfinder } from '../systems/Pathfinding';
import { UPGRADE_PRICE } from '../config/weapons.config';
import { VillageMap, DebrisObject } from '../world/VillageMap';
import { registerGame } from '../systems/Records';

const INTERACT_RANGE = 90; // distance pour interagir (débris, caisses d'armes)

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private zombies: Zombie[] = [];
  private map!: VillageMap;
  private pathfinder!: Pathfinder;
  private roundManager!: RoundManager;
  private gameOver: boolean = false;

  private poisonClouds: { x: number; y: number; until: number; vis: Phaser.GameObjects.Arc }[] = [];
  private poisonTickAccum: number = 0;
  private ammoCrates: { x: number; y: number; parts: Phaser.GameObjects.GameObject[] }[] = [];

  // Easter-egg du gros débris (raccourci forêt ⇄ église)
  private eggExplosifsTaken = false;
  private eggExplosifsPlaced = false;
  private eggDetonateurTaken = false;
  private eggDone = false;
  private explosifsParts: Phaser.GameObjects.GameObject[] = [];
  private detonateurParts: Phaser.GameObjects.GameObject[] = [];
  private eggChargeParts: Phaser.GameObjects.GameObject[] = [];

  private points: number = 0;
  private kills: number = 0;
  private hudText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private promptOverrideUntil: number = 0; // message temporaire (ex. achat bloqué)
  private keyInteract!: Phaser.Input.Keyboard.Key;
  private keyPause!: Phaser.Input.Keyboard.Key;
  private paused: boolean = false;
  private pauseText!: Phaser.GameObjects.Text;
  private confirmQuit: boolean = false;
  private confirmUI: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset (la scène peut être relancée par « rejouer »)
    this.zombies = [];
    this.gameOver = false;
    this.paused = false;
    this.confirmQuit = false;
    this.points = 0;
    this.kills = 0;
    this.promptOverrideUntil = 0;
    this.events.off('playerDead', this.onPlayerDead, this);
    this.events.off('zombieHit', this.onZombieHit, this);
    this.events.off('zombieKilled', this.onZombieKilled, this);
    this.events.off('roundStarted', this.onRoundStarted, this);
    this.events.off('roundEnded', this.onRoundEnded, this);
    this.events.off('gazeExploded', this.onGazeExploded, this);
    this.poisonClouds = [];
    this.poisonTickAccum = 0;
    this.ammoCrates = [];
    this.eggExplosifsTaken = false;
    this.eggExplosifsPlaced = false;
    this.eggDetonateurTaken = false;
    this.eggDone = false;
    this.explosifsParts = [];
    this.detonateurParts = [];
    this.eggChargeParts = [];

    // Map du village + grille de pathfinding
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.map = new VillageMap(this);

    this.pathfinder = new Pathfinder(MAP_WIDTH, MAP_HEIGHT, 32);
    for (const def of WALLS) {
      this.pathfinder.addObstacleRect(def.x, def.y, def.w, def.h);
    }
    for (const d of this.map.debris) {
      this.pathfinder.addObstacleRect(d.def.x, d.def.y, d.def.w, d.def.h);
    }

    // Marqueurs de l'easter-egg (explosifs dans la cabane, détonateur dans la grange)
    this.createEggMarkers();

    // Joueur — devant l'autel de l'église
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player, this.map.obstacles);
    this.physics.add.collider(this.player, this.map.vitraux);

    // Camera
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Interaction (déblayer les débris)
    this.keyInteract = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyPause = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // M : retour au menu
    this.input.keyboard!.on('keydown-M', () => {
      if (this.gameOver) {
        this.physics.resume();
        this.scene.start('MenuScene');
      } else if (this.paused && !this.confirmQuit) {
        this.showQuitConfirm();
      }
    });
    this.input.keyboard!.on('keydown-O', () => {
      if (this.confirmQuit) {
        this.physics.resume();
        this.scene.start('MenuScene');
      }
    });
    this.input.keyboard!.on('keydown-N', () => {
      if (this.confirmQuit) this.hideQuitConfirm();
    });

    // Modale de confirmation (créée cachée)
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setScrollFactor(0)
      .setDepth(300);
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 560, 210, 0x161412)
      .setStrokeStyle(2, 0xff1744)
      .setScrollFactor(0)
      .setDepth(301);
    const confirmText = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 20,
        'Retourner au menu principal ?\n\nVous perdrez votre progression.',
        {
          font: 'bold 20px monospace',
          color: '#eeeeee',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);
    const confirmKeys = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'O — oui   ·   N — non', {
        font: 'bold 18px monospace',
        color: '#ffdd00',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);
    this.confirmUI = [dim, panel, confirmText, confirmKeys];
    this.confirmUI.forEach(o => (o as Phaser.GameObjects.Rectangle).setVisible(false));

    this.pauseText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSE\n\nÉchap — reprendre\nM — menu principal', {
        font: 'bold 48px monospace',
        color: '#ffdd00',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    this.promptText = this.add
      .text(0, 0, '', {
        font: 'bold 14px monospace',
        color: '#ffdd00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(150)
      .setVisible(false);

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
    this.events.on('gazeExploded', this.onGazeExploded, this);

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
        .text(16, 16, 'ProjectZ — DEV | Clic : tirer | ZQSD : bouger | R : recharger | E : acheter/déblayer | A : changer d\'arme', {
          font: '13px monospace',
          color: '#666666',
        })
        .setScrollFactor(0)
        .setDepth(100);
    }
  }

  /** Crée les objets ramassables de l'easter-egg (explosifs + détonateur). */
  private createEggMarkers(): void {
    const e = EGG.explosifs;
    const box = this.add.rectangle(e.x, e.y, 28, 18, 0x8e2b20).setDepth(6);
    const stick1 = this.add.rectangle(e.x - 5, e.y - 4, 5, 16, 0xd35400).setDepth(6);
    const stick2 = this.add.rectangle(e.x + 5, e.y - 4, 5, 16, 0xd35400).setDepth(6);
    this.explosifsParts = [box, stick1, stick2];

    const d = EGG.detonateur;
    const planks = this.add.rectangle(d.x, d.y, 30, 22, 0x3a2a1c).setDepth(5);
    const body = this.add.rectangle(d.x, d.y, 16, 12, 0x37474f).setDepth(6);
    const handle = this.add.rectangle(d.x, d.y - 9, 18, 5, 0x90a4ae).setDepth(6);
    this.detonateurParts = [planks, body, handle];
  }

  private clearEggMarker(which: 'explosifs' | 'detonateur'): void {
    const parts = which === 'explosifs' ? this.explosifsParts : this.detonateurParts;
    parts.forEach(p => p.destroy());
    if (which === 'explosifs') this.explosifsParts = [];
    else this.detonateurParts = [];
  }

  /** Pose visuelle des explosifs contre le gros débris. */
  private placeChargeVisual(x: number, y: number): void {
    const c1 = this.add.rectangle(x - 32, y, 16, 30, 0x8e2b20).setDepth(3);
    const c2 = this.add.rectangle(x + 32, y, 16, 30, 0x8e2b20).setDepth(3);
    const wire = this.add.rectangle(x, y, 64, 4, 0xd35400).setDepth(3);
    this.eggChargeParts = [c1, c2, wire];
  }

  /** Déclenche l'explosion : ouvre le raccourci forêt ⇄ église. */
  private blowGrosDebris(d: DebrisObject): void {
    if (this.eggDone) return;
    this.eggDone = true;
    this.eggChargeParts.forEach(p => p.destroy());
    this.eggChargeParts = [];
    this.map.clear(d);
    this.pathfinder.removeObstacleRect(d.def.x, d.def.y, d.def.w, d.def.h);

    const boom = this.add.circle(d.def.x, d.def.y, 90, 0xffa726, 0.7).setDepth(20);
    this.tweens.add({
      targets: boom,
      scale: 2.4,
      alpha: 0,
      duration: 650,
      onComplete: () => boom.destroy(),
    });
    this.cameras.main.shake(450, 0.012);
    this.floatingText(d.def.x, d.def.y - 30, 'PASSAGE OUVERT !', '#ffdd00');
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyPause)) {
      if (this.confirmQuit) {
        this.hideQuitConfirm();
      } else {
        this.togglePause();
      }
    }
    if (this.paused) return;

    const pointer = this.input.activePointer;
    this.player.update(time, delta, pointer);
    this.updateHud();

    this.roundManager.update(time, delta);
    this.updateRoundHud();

    this.zombies = this.zombies.filter(z => z.active);
    this.zombies.forEach(z => z.update(time, delta, this.player));

    // Balles → zombies (perforation : jusqu'à 3 cibles, dégâts dégressifs)
    this.physics.overlap(
      this.player.bullets,
      this.zombies,
      (bullet, zombie) => {
        const b = bullet as Bullet;
        const z = zombie as Zombie;
        if (!z.isAlive()) return;
        const dmg = b.registerHit(z);
        if (dmg !== null) z.takeDamage(dmg);
      }
    );

    this.physics.overlap(this.player, this.zombies, (_player, zombie) => {
      (zombie as Zombie).tryAttack(this.player, time);
    });

    // Séparation douce entre zombies
    this.physics.overlap(this.zombies, this.zombies, (za, zb) => {
      const a = za as Zombie;
      const b = zb as Zombie;
      if (a === b || !a.isAlive() || !b.isAlive()) return;
      if (a.isEmerging() || b.isEmerging()) return;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = 24;
      if (dist >= minDist) return;

      const push = (minDist - dist) * 0.35;
      const nx = dx / dist;
      const ny = dy / dist;
      a.body.x -= nx * push;
      a.body.y -= ny * push;
      b.body.x += nx * push;
      b.body.y += ny * push;
    });

    // Murs : bloquent les zombies, arrêtent les balles
    this.physics.collide(this.zombies, this.map.obstacles);
    this.physics.overlap(this.player.bullets, this.map.obstacles, bullet => {
      (bullet as Bullet).destroy();
    });

    // Débris encore en place : bloquent tout
    const activeDebris = this.map.debris.filter(d => !d.cleared).map(d => d.rect);
    if (activeDebris.length > 0) {
      this.physics.collide(this.player, activeDebris);
      this.physics.collide(this.zombies, activeDebris);
      this.physics.overlap(this.player.bullets, activeDebris, bullet => {
        (bullet as Bullet).destroy();
      });
    }

    this.handleInteractions();
    this.updatePoison(time, delta);
  }

  /** Petit texte qui monte et s'efface. */
  private floatingText(x: number, y: number, msg: string, color: string): void {
    const t = this.add
      .text(x, y, msg, { font: 'bold 16px monospace', color })
      .setOrigin(0.5)
      .setDepth(150);
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Le dernier Gazé d'une manche spéciale lâche une caisse de munitions. */
  private dropAmmoCrate(x: number, y: number): void {
    while (this.ammoCrates.length >= AMMO_CRATE_MAX) {
      const oldest = this.ammoCrates.shift()!;
      this.tweens.add({
        targets: oldest.parts,
        alpha: 0,
        duration: 500,
        onComplete: () => oldest.parts.forEach(p => p.destroy()),
      });
    }

    const box = this.add.rectangle(x, y, 28, 20, 0x8d6e63).setDepth(7);
    const stripe = this.add.rectangle(x, y, 28, 6, 0xffdd00).setDepth(7);

    this.ammoCrates.push({ x, y, parts: [box, stripe] });
    this.floatingText(x, y - 24, 'CAISSE DE MUNITIONS', '#ffdd00');
  }

  /** Nuages de poison : expiration + dégâts sur la durée au joueur. */
  private updatePoison(time: number, delta: number): void {
    this.poisonClouds = this.poisonClouds.filter(c => {
      if (time < c.until) return true;
      this.tweens.add({
        targets: c.vis,
        alpha: 0,
        duration: 400,
        onComplete: () => c.vis.destroy(),
      });
      return false;
    });

    const inPoison = this.poisonClouds.some(
      c => Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < POISON_RADIUS
    );

    if (inPoison) {
      this.poisonTickAccum += delta;
      while (this.poisonTickAccum >= 500) {
        this.poisonTickAccum -= 500;
        this.player.takeDamage(POISON_DPS / 2);
      }
    } else {
      this.poisonTickAccum = 0;
    }
  }

  /** Explosion d'un Gazé : nuage de poison persistant. */
  private onGazeExploded(x: number, y: number): void {
    const vis = this.add.circle(x, y, POISON_RADIUS, 0x76ff03, 0.22).setDepth(6);
    this.tweens.add({
      targets: vis,
      alpha: 0.34,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.poisonClouds.push({ x, y, until: this.time.now + POISON_DURATION, vis });

    if (
      isSpecialRound(this.roundManager.getRound()) &&
      this.roundManager.getRemainingInRound() === 0
    ) {
      this.dropAmmoCrate(x, y);
    }
  }

  /**
   * Interaction unifiée à la touche E : débris, caisses d'armes, forge,
   * et les objets de l'easter-egg (explosifs, détonateur, gros débris).
   */
  private handleInteractions(): void {
    if (this.time.now < this.promptOverrideUntil) return;

    type Interactable = {
      x: number;
      y: number;
      promptY: number;
      label: string;
      price: number;
      canBuy: boolean;
      blockedReason?: string;
      buy: () => void;
    };

    let nearest: Interactable | null = null;
    let nearestDist = INTERACT_RANGE;

    const consider = (i: Interactable, dist: number) => {
      if (dist < nearestDist) {
        nearest = i;
        nearestDist = dist;
      }
    };

    for (const d of this.map.debris) {
      if (d.cleared) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.def.x, d.def.y);

      // Gros débris scellé : chaîne explosifs → détonateur → explosion.
      if (d.def.sealed) {
        let label: string;
        let canBuy = false;
        let blockedReason: string | undefined;
        let act: () => void = () => {};

        if (!this.eggExplosifsPlaced) {
          if (this.eggExplosifsTaken) {
            label = 'E — Poser les explosifs sur le mur éboulé';
            canBuy = true;
            act = () => {
              this.eggExplosifsPlaced = true;
              this.placeChargeVisual(d.def.x, d.def.y);
              this.floatingText(d.def.x, d.def.y - 24, 'EXPLOSIFS POSÉS', '#e74c3c');
            };
          } else {
            label = 'Mur éboulé — il faudrait des explosifs (cabane de chasse, forêt)';
            blockedReason = label;
          }
        } else if (!this.eggDetonateurTaken) {
          label = 'Explosifs posés — il manque un détonateur (grange, ferme)';
          blockedReason = label;
        } else {
          label = 'E — DÉCLENCHER L\'EXPLOSION';
          canBuy = true;
          act = () => this.blowGrosDebris(d);
        }

        consider(
          {
            x: d.def.x,
            y: d.def.y,
            promptY: d.def.y - d.def.h / 2 - 12,
            label,
            price: 0,
            canBuy,
            blockedReason,
            buy: act,
          },
          dist
        );
        continue;
      }

      consider(
        {
          x: d.def.x,
          y: d.def.y,
          promptY: d.def.y - d.def.h / 2 - 12,
          label: `E — Déblayer : ${d.def.label} (${d.def.price} pts)`,
          price: d.def.price,
          canBuy: true,
          buy: () => {
            this.map.clear(d);
            this.pathfinder.removeObstacleRect(d.def.x, d.def.y, d.def.w, d.def.h);
          },
        },
        dist
      );
    }

    for (const ws of this.map.weaponSpots) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, ws.spot.x, ws.spot.y);
      const owned = this.player.ownsWeapon(ws.weapon.id);
      const fullName = `${ws.weapon.name} — ${ws.weapon.category}`;

      let label: string;
      let canBuy = false;
      let blockedReason: string | undefined;

      const refillPrice = this.player.getAmmoRefillPrice(ws.weapon.id);
      if (owned) {
        if (this.player.isReserveFull(ws.weapon.id)) {
          label = `${fullName} — munitions pleines`;
        } else {
          label = `E — Racheter des chargeurs : ${ws.weapon.name} (${refillPrice} pts)`;
          canBuy = true;
        }
      } else if (!this.player.hasMainWeapon()) {
        label = `E — Acheter : ${fullName} (${ws.weapon.price} pts)`;
        canBuy = true;
      } else if (this.player.isHoldingPistol()) {
        label = `${fullName} (${ws.weapon.price} pts)`;
        blockedReason = `Le MAS 1935A n'est pas échangeable — passe sur ton arme principale (A)`;
      } else {
        label = `E — Échanger ${this.player.getMainWeaponName()} → ${fullName} (${ws.weapon.price} pts)`;
        canBuy = true;
      }

      consider(
        {
          x: ws.spot.x,
          y: ws.spot.y,
          promptY: ws.spot.y - 26,
          label,
          price: owned ? refillPrice : ws.weapon.price,
          canBuy,
          blockedReason,
          buy: () =>
            owned
              ? this.player.refillAmmo(ws.weapon.id)
              : this.player.equipWeapon(ws.weapon),
        },
        dist
      );
    }

    for (const c of this.ammoCrates) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      const hasMain = this.player.hasMainWeapon();
      consider(
        {
          x: c.x,
          y: c.y,
          promptY: c.y - 22,
          label: hasMain ? 'E — Prendre la caisse de munitions' : 'Caisse de munitions',
          price: 0,
          canBuy: hasMain,
          blockedReason: hasMain
            ? undefined
            : 'Aucune arme principale — la caisse ne bouge pas, reviens plus tard',
          buy: () => {
            this.player.refillMainWeaponAmmo();
            this.floatingText(c.x, c.y - 20, 'MUNITIONS !', '#ffdd00');
            c.parts.forEach(p => p.destroy());
            this.ammoCrates = this.ammoCrates.filter(k => k !== c);
          },
        },
        dist
      );
    }

    // Easter-egg : ramassage des explosifs (cabane) et du détonateur (grange)
    if (!this.eggExplosifsTaken) {
      const e = EGG.explosifs;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      consider(
        {
          x: e.x, y: e.y, promptY: e.y - 22,
          label: 'E — Prendre les explosifs', price: 0, canBuy: true,
          buy: () => {
            this.eggExplosifsTaken = true;
            this.clearEggMarker('explosifs');
            this.floatingText(e.x, e.y - 20, 'EXPLOSIFS RÉCUPÉRÉS', '#e74c3c');
          },
        },
        dist
      );
    }
    if (!this.eggDetonateurTaken) {
      const e = EGG.detonateur;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      consider(
        {
          x: e.x, y: e.y, promptY: e.y - 22,
          label: 'E — Fouiller la cache : prendre le détonateur', price: 0, canBuy: true,
          buy: () => {
            this.eggDetonateurTaken = true;
            this.clearEggMarker('detonateur');
            this.floatingText(e.x, e.y - 20, 'DÉTONATEUR RÉCUPÉRÉ', '#ffdd00');
          },
        },
        dist
      );
    }

    // Forge (enclume du cimetière) : amélioration de l'arme TENUE
    {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, FORGE_SPOT.x, FORGE_SPOT.y
      );
      const weaponName = this.player.getWeaponName();
      const upgraded = this.player.isHeldWeaponUpgraded();
      consider(
        {
          x: FORGE_SPOT.x,
          y: FORGE_SPOT.y,
          promptY: FORGE_SPOT.y - 30,
          label: upgraded
            ? `${weaponName} — déjà améliorée`
            : `E — Améliorer ${weaponName} : +dégâts, +chargeur (${UPGRADE_PRICE} pts)`,
          price: UPGRADE_PRICE,
          canBuy: !upgraded,
          blockedReason: upgraded ? 'Cette arme est déjà améliorée' : undefined,
          buy: () => {
            if (this.player.upgradeHeldWeapon()) {
              this.floatingText(FORGE_SPOT.x, FORGE_SPOT.y - 24, 'ARME AMÉLIORÉE !', '#ffdd00');
            }
          },
        },
        dist
      );
    }

    if (!nearest) {
      this.promptText.setVisible(false);
      return;
    }
    const target: Interactable = nearest;

    this.promptText
      .setText(target.label)
      .setPosition(target.x, target.promptY)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.keyInteract)) {
      if (!target.canBuy) {
        if (target.blockedReason) {
          this.promptText.setText(target.blockedReason).setColor('#ff1744');
          this.promptOverrideUntil = this.time.now + 1500;
          this.time.delayedCall(1500, () => this.promptText.setColor('#ffdd00'));
        }
      } else if (this.points >= target.price) {
        this.points -= target.price;
        target.buy();
        this.promptText.setVisible(false);
        this.updateHud();
      } else {
        this.promptText.setColor('#ff1744');
        this.time.delayedCall(300, () => this.promptText.setColor('#ffdd00'));
      }
    }
  }

  /**
   * Cherche un point de sortie de terre juste HORS du champ de la caméra :
   * proche du joueur, sur une cellule libre, jamais dans l'église, joignable.
   */
  private findOffscreenGroundSpot(): { x: number; y: number } | null {
    const view = this.cameras.main.worldView;
    const baseRadius = Math.hypot(view.width, view.height) / 2;

    for (let i = 0; i < 20; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = baseRadius + Phaser.Math.Between(60, 260);
      const x = this.player.x + Math.cos(angle) * radius;
      const y = this.player.y + Math.sin(angle) * radius;

      if (x < 60 || y < 60 || x > MAP_WIDTH - 60 || y > MAP_HEIGHT - 60) continue;
      if (x > 810 && x < 1750 && y > 180 && y < 880) continue;
      if (view.contains(x, y)) continue;
      if (this.pathfinder.isBlockedAt(x, y)) continue;
      if (!this.canReachPlayer(x, y)) continue;

      return { x, y };
    }
    return null;
  }

  /** Le point peut-il atteindre le joueur (zones scellées exclues) ? */
  private canReachPlayer(x: number, y: number): boolean {
    return this.pathfinder.findPath(x, y, this.player.x, this.player.y) !== null;
  }

  /** Spawn un Fantassin : sortie de terre (ground) ou entrée cardinale (edge). */
  private spawnZombie(): void {
    if (this.gameOver) return;

    const round = this.roundManager.getRound();
    let stats;
    if (isSpecialRound(round)) {
      stats = { ...GAZE_STATS, hp: gazeHpForRound(round) };
    } else if (Math.random() < coureurRatioForRound(round)) {
      stats = { ...COUREUR_STATS, hp: coureurHpForRound(round) };
    } else if (Math.random() < ssRatioForRound(round)) {
      stats = { ...SS_STATS, hp: ssHpForRound(round) };
    } else {
      stats = { ...FANTASSIN_STATS, hp: fantassinHpForRound(round) };
    }

    // Sortie de terre dynamique juste hors champ (priorité : reste près du joueur)
    if (Math.random() < DYNAMIC_SPAWN_CHANCE) {
      const spot = this.findOffscreenGroundSpot();
      if (spot) {
        const emergeMs = Phaser.Math.Between(2000, 3000);
        this.zombies.push(new Zombie(this, spot.x, spot.y, stats, this.pathfinder, emergeMs));
        return;
      }
    }

    // Sinon : un point fixe proche du joueur. Joignable ET pas trop loin
    // (~1,3 écran) — éviter qu'un zombie apparaisse à l'autre bout de la map,
    // pénible à traquer quand il n'en reste qu'un.
    const view = this.cameras.main.worldView;
    const maxSpawnDist = Math.hypot(view.width, view.height) * 1.3;
    const distToPlayer = (p: { x: number; y: number }) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
    const reachable = SPAWN_POINTS.filter(p => this.canReachPlayer(p.x, p.y));
    const near = reachable.filter(p => distToPlayer(p) <= maxSpawnDist);
    if (near.length === 0) {
      const spot = this.findOffscreenGroundSpot();
      if (spot) {
        const emergeMs = Phaser.Math.Between(2000, 3000);
        this.zombies.push(new Zombie(this, spot.x, spot.y, stats, this.pathfinder, emergeMs));
        return;
      }
    }
    const pool = near.length > 0 ? near : reachable.length > 0 ? reachable : SPAWN_POINTS;
    const sorted = [...pool].sort(
      (a, b) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
    );
    const point = Phaser.Math.RND.pick(sorted.slice(0, 3));
    let x = point.x;
    let y = point.y;

    if (point.type === 'edge') {
      if (point.y < 0 || point.y > MAP_HEIGHT) {
        x += Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
      } else {
        y += Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const jx = point.x + Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
        const jy = point.y + Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
        if (!this.pathfinder.isBlockedAt(jx, jy)) {
          x = jx;
          y = jy;
          break;
        }
      }
    }

    const emergeMs = point.type === 'ground' ? Phaser.Math.Between(2000, 3000) : 0;
    this.zombies.push(new Zombie(this, x, y, stats, this.pathfinder, emergeMs));
  }

  private onRoundStarted(round: number): void {
    this.updateRoundHud();

    const special = isSpecialRound(round);
    const announce = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 3,
        special ? `— MANCHE ${round} : GAZ ! —` : `— MANCHE ${round} —`,
        {
          font: 'bold 48px monospace',
          color: special ? '#76ff03' : '#ff1744',
        }
      )
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

  private updateRoundHud(): void {
    const round = this.roundManager.getRound();
    const text = this.roundManager.isIntermission()
      ? `Manche ${round} — accalmie`
      : `Manche ${round} — ${this.roundManager.getRemainingInRound()} restants`;
    if (this.roundText.text !== text) this.roundText.setText(text);
  }

  private updateHud(): void {
    const reserve = this.player.getReserveAmmo();
    const reserveTxt = reserve < 0 ? '∞' : `${reserve}`;
    const ammo = this.player.isReloadingNow()
      ? 'RECHARGE…'
      : `${this.player.getAmmo()}/${this.player.getMagazineSize()} | ${reserveTxt}`;
    const text = `Points : ${this.points}   Kills : ${this.kills}   ${this.player.getWeaponName()} (${this.player.getWeaponCategory()}) : ${ammo}`;
    if (this.hudText.text !== text) this.hudText.setText(text);
  }

  private showQuitConfirm(): void {
    this.confirmQuit = true;
    this.pauseText.setVisible(false);
    this.confirmUI.forEach(o => (o as Phaser.GameObjects.Rectangle).setVisible(true));
  }

  private hideQuitConfirm(): void {
    this.confirmQuit = false;
    this.confirmUI.forEach(o => (o as Phaser.GameObjects.Rectangle).setVisible(false));
    this.pauseText.setVisible(this.paused);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
    } else {
      this.physics.resume();
    }
    this.pauseText.setVisible(this.paused);
  }

  private onPlayerDead(): void {
    this.gameOver = true;
    this.zombies.forEach(z => z.body && z.body.setVelocity(0, 0));
    this.promptText.setVisible(false);

    registerGame({
      round: this.roundManager.getRound(),
      kills: this.kills,
      points: this.points,
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 30,
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

    this.time.delayedCall(800, () => {
      const replay = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, '— CLIQUE POUR REJOUER —\nM — menu principal', {
          align: 'center',
          font: 'bold 22px monospace',
          color: '#ffdd00',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(200);

      this.tweens.add({
        targets: replay,
        alpha: 0.25,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });

      this.input.once('pointerdown', () => this.scene.restart());
    });
  }
}
