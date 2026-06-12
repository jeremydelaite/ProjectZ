import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.config';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_START,
  SPAWN_POINTS,
  SPAWN_JITTER,
  WALLS,
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
  AMMO_CRATE_DURATION,
} from '../config/zombies.config';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';
import { RoundManager } from '../systems/RoundManager';
import { Pathfinder } from '../systems/Pathfinding';
import { AMMO_REFILL_PRICE } from '../config/weapons.config';
import { VillageMap } from '../world/VillageMap';
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
  private ammoCrates: { x: number; y: number; until: number; parts: Phaser.GameObjects.GameObject[] }[] = [];

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
    // Les listeners survivent au restart : on repart de zéro
    this.events.off('playerDead', this.onPlayerDead, this);
    this.events.off('zombieHit', this.onZombieHit, this);
    this.events.off('zombieKilled', this.onZombieKilled, this);
    this.events.off('roundStarted', this.onRoundStarted, this);
    this.events.off('roundEnded', this.onRoundEnded, this);
    this.events.off('gazeExploded', this.onGazeExploded, this);
    this.poisonClouds = [];
    this.poisonTickAccum = 0;
    this.ammoCrates = [];

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

    // M : retour au menu — direct au game over (rien à perdre),
    // avec confirmation depuis la pause (la progression serait perdue)
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

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    // Pause (Échap) — ferme d'abord la modale de confirmation si ouverte
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

    // Purge des zombies détruits + update
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

    // Zombies → joueur (attaque au contact, avec cooldown)
    this.physics.overlap(this.player, this.zombies, (_player, zombie) => {
      (zombie as Zombie).tryAttack(this.player, time);
    });

    // Séparation douce entre zombies : ils se contournent au lieu de se
    // bloquer mutuellement (les collisions dures créaient des bouchons
    // dans les vitraux et contre les murs)
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
    // (les vitraux ne bloquent ni les zombies ni les balles)
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
    this.updateAmmoCrates(time);
  }

  /** Caisses de munitions : expiration + ramassage au contact. */
  private updateAmmoCrates(time: number): void {
    this.ammoCrates = this.ammoCrates.filter(c => {
      if (time >= c.until) {
        c.parts.forEach(p => p.destroy());
        return false;
      }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < 40) {
        const refilled = this.player.refillMainWeaponAmmo();
        this.floatingText(
          c.x,
          c.y - 20,
          refilled ? 'MUNITIONS !' : 'MUNITIONS (aucune arme principale)',
          '#ffdd00'
        );
        c.parts.forEach(p => p.destroy());
        return false;
      }
      return true;
    });
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
    const box = this.add.rectangle(x, y, 28, 20, 0x8d6e63).setDepth(7);
    const stripe = this.add.rectangle(x, y, 28, 6, 0xffdd00).setDepth(7);
    const parts: Phaser.GameObjects.GameObject[] = [box, stripe];

    // Clignote sur la fin de vie
    this.tweens.add({
      targets: parts,
      alpha: 0.25,
      duration: 300,
      yoyo: true,
      repeat: -1,
      delay: AMMO_CRATE_DURATION - 5000,
    });

    this.ammoCrates.push({ x, y, until: this.time.now + AMMO_CRATE_DURATION, parts });
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
      // Dégâts par demi-secondes : POISON_DPS/s au total
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

    // Dernier Gazé de la manche spéciale → caisse de munitions
    if (
      isSpecialRound(this.roundManager.getRound()) &&
      this.roundManager.getRemainingInRound() === 0
    ) {
      this.dropAmmoCrate(x, y);
    }
  }

  /**
   * Interaction unifiée à la touche E : débris à déblayer et caisses d'armes.
   * Affiche le prompt de l'interactable le plus proche à portée.
   */
  private handleInteractions(): void {
    // Un message temporaire (ex. raison de blocage) garde la main sur le prompt
    if (this.time.now < this.promptOverrideUntil) return;

    type Interactable = {
      x: number;
      y: number;
      promptY: number;
      label: string;
      price: number;
      canBuy: boolean;
      blockedReason?: string; // affiché en rouge si on appuie sur E
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
            // Le passage s'ouvre aussi pour le pathfinding des zombies
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

      if (owned) {
        // Arme déjà possédée : la caisse vend des chargeurs
        if (this.player.isReserveFull(ws.weapon.id)) {
          label = `${fullName} — munitions pleines`;
        } else {
          label = `E — Racheter des chargeurs : ${ws.weapon.name} (${AMMO_REFILL_PRICE} pts)`;
          canBuy = true;
        }
      } else if (!this.player.hasMainWeapon()) {
        // Emplacement principal libre : achat direct
        label = `E — Acheter : ${fullName} (${ws.weapon.price} pts)`;
        canBuy = true;
      } else if (this.player.isHoldingPistol()) {
        // On tient le pistolet : il n'est pas échangeable
        label = `${fullName} (${ws.weapon.price} pts)`;
        blockedReason = `Le MAS 1935A n'est pas échangeable — passe sur ton arme principale (A)`;
      } else {
        // On tient l'arme principale : l'achat l'échange
        label = `E — Échanger ${this.player.getMainWeaponName()} → ${fullName} (${ws.weapon.price} pts)`;
        canBuy = true;
      }

      consider(
        {
          x: ws.spot.x,
          y: ws.spot.y,
          promptY: ws.spot.y - 26,
          label,
          price: owned ? AMMO_REFILL_PRICE : ws.weapon.price,
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
        // Achat bloqué : afficher la raison en rouge
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
        // Pas assez de points : flash rouge
        this.promptText.setColor('#ff1744');
        this.time.delayedCall(300, () => this.promptText.setColor('#ffdd00'));
      }
    }
  }

  /**
   * Cherche un point de sortie de terre juste HORS du champ de la caméra :
   * proche du joueur, sur une cellule libre, jamais dans l'église
   * (elle garde ses entrées connues : vitraux + sorties).
   */
  private findOffscreenGroundSpot(): { x: number; y: number } | null {
    const view = this.cameras.main.worldView;
    const baseRadius = Math.hypot(view.width, view.height) / 2;

    for (let i = 0; i < 12; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = baseRadius + Phaser.Math.Between(60, 260);
      const x = this.player.x + Math.cos(angle) * radius;
      const y = this.player.y + Math.sin(angle) * radius;

      // Dans la map (marge des murs d'enceinte)
      if (x < 60 || y < 60 || x > MAP_WIDTH - 60 || y > MAP_HEIGHT - 60) continue;
      // Jamais dans l'église (intérieur + marge)
      if (x > 810 && x < 1750 && y > 180 && y < 880) continue;
      // Toujours hors champ
      if (view.contains(x, y)) continue;
      // Sur une cellule libre de la grille
      if (this.pathfinder.isBlockedAt(x, y)) continue;

      return { x, y };
    }
    return null;
  }

  /** Spawn un Fantassin : sortie de terre (ground) ou entrée cardinale (edge). */
  private spawnZombie(): void {
    if (this.gameOver) return;

    // Composition de la horde :
    // - manches spéciales (5, 10, 15…) : 100 % Gazés
    // - sinon : Coureurs (manche 4+, ≤25 %), puis SS qui remplacent
    //   progressivement les Fantassins (manche 6+, jusqu'à 85 %)
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

    // Sortie de terre dynamique juste hors champ (réduit le temps de trajet,
    // surtout quand le joueur est retranché dans l'église)
    if (Math.random() < DYNAMIC_SPAWN_CHANCE) {
      const spot = this.findOffscreenGroundSpot();
      if (spot) {
        const emergeMs = Phaser.Math.Between(2000, 3000);
        this.zombies.push(new Zombie(this, spot.x, spot.y, stats, this.pathfinder, emergeMs));
        return;
      }
    }

    // Sinon : un des 3 points fixes les plus proches du joueur
    const sorted = [...SPAWN_POINTS].sort(
      (a, b) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
    );
    const point = Phaser.Math.RND.pick(sorted.slice(0, 3));
    let x = point.x;
    let y = point.y;

    if (point.type === 'edge') {
      // Hors-map : jitter uniquement le long de la brèche
      if (point.y < 0 || point.y > MAP_HEIGHT) {
        x += Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
      } else {
        y += Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
      }
    } else {
      // Sortie de terre : jitter revalidé contre la grille (jamais dans un mur)
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
    // Annonce centrale qui s'estompe
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

    // États de service (persistés dans le navigateur)
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

    // Rejouer (petit délai pour ne pas cliquer par accident en tirant)
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
