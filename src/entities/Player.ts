import Phaser from 'phaser';
import { Bullet } from './Bullet';
import { Stats } from '../types';
import { WeaponDef, WEAPONS } from '../config/weapons.config';

interface WeaponSlot {
  def: WeaponDef;
  currentAmmo: number;
  reserveAmmo: number; // balles en réserve (-1 = illimité, ex. pistolet)
}

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private stats: Stats = {
    hp: 80,    // 4 coups de Fantassin (20 dégâts)
    maxHp: 80,
    speed: 200,
  };

  // Régénération style COD : repart N ms après le dernier coup reçu
  private static readonly REGEN_DELAY = 3000; // ms sans dégât avant régén
  private static readonly REGEN_RATE = 35;    // PV par seconde (~2,3 s pour tout)
  private lastDamageTime: number = -Infinity;

  // Verrou de début de partie : ni tir ni déplacement pendant N ms
  // (évite de tirer en spammant le clic sur « rejouer »)
  private static readonly SPAWN_LOCK = 800; // ms
  private controlsLockedUntil: number = 0;

  // 2 armes max : [0] = arme de poing (toujours là), [1] = arme principale
  private weapons: WeaponSlot[] = [
    {
      def: WEAPONS.mas_1935a,
      currentAmmo: WEAPONS.mas_1935a.magazineSize,
      reserveAmmo: -1,
    },
  ];
  private currentWeapon: number = 0;

  private lastFired: number = 0;
  private isDead: boolean = false;
  // false au départ : la toute première balle exige un clic frais
  // (le clic qui a lancé la partie ne compte pas)
  private pointerReleased: boolean = false;

  // Rechargement (réserve illimitée, mais changer de chargeur prend du temps)
  private isReloading: boolean = false;
  private reloadStarted: number = 0;

  // Touches ZQSD (AZERTY) + R recharger + A changer d'arme
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    reload: Phaser.Input.Keyboard.Key;
    switch: Phaser.Input.Keyboard.Key;
  };

  public bullets: Bullet[] = [];

  // Visuel placeholder
  private body_rect: Phaser.GameObjects.Rectangle;
  private barrel: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Graphics;
  private reloadBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Corps du joueur (carré vert foncé)
    this.body_rect = scene.add.rectangle(0, 0, 28, 28, 0x2e7d32);
    // Canon (rectangle qui pointe vers la droite par défaut)
    this.barrel = scene.add.rectangle(18, 0, 16, 6, 0x1b5e20);
    // Barre de vie (au dessus)
    this.hpBar = scene.add.graphics();
    // Barre de rechargement (sous la barre de vie)
    this.reloadBar = scene.add.graphics();

    this.add([this.body_rect, this.barrel, this.hpBar, this.reloadBar]);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Sur un Container, le corps est ancré sur l'origine : il faut le recentrer
    this.body.setSize(28, 28);
    this.body.setOffset(-14, -14);
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);

    // Input ZQSD + R + A
    this.keys = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      reload: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      switch: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    };

    this.drawHpBar();

    this.controlsLockedUntil = scene.time.now + Player.SPAWN_LOCK;
  }

  // ---------------------------------------------------------------- armes

  private get weapon(): WeaponSlot {
    return this.weapons[this.currentWeapon];
  }

  private fullReserve(def: WeaponDef): number {
    return def.reserveMagazines < 0 ? -1 : def.reserveMagazines * def.magazineSize;
  }

  /** Équipe une arme achetée. Remplace l'arme principale si on en a déjà une. */
  equipWeapon(def: WeaponDef): void {
    const slot: WeaponSlot = {
      def,
      currentAmmo: def.magazineSize,
      reserveAmmo: this.fullReserve(def),
    };
    if (this.weapons.length === 1) {
      this.weapons.push(slot);
    } else {
      this.weapons[1] = slot;
    }
    this.currentWeapon = 1;
    this.isReloading = false;
  }

  ownsWeapon(id: string): boolean {
    return this.weapons.some(w => w.def.id === id);
  }

  /** A déjà une arme principale (en plus du pistolet). */
  hasMainWeapon(): boolean {
    return this.weapons.length > 1;
  }

  /** Tient actuellement le pistolet (emplacement 0, non échangeable). */
  isHoldingPistol(): boolean {
    return this.currentWeapon === 0;
  }

  /** Nom de l'arme principale actuelle (si elle existe). */
  getMainWeaponName(): string | null {
    return this.weapons.length > 1 ? this.weapons[1].def.name : null;
  }

  /** La réserve de cette arme est-elle déjà pleine ? */
  isReserveFull(weaponId: string): boolean {
    const slot = this.weapons.find(w => w.def.id === weaponId);
    if (!slot) return false;
    const full = this.fullReserve(slot.def);
    return full < 0 || slot.reserveAmmo >= full;
  }

  /**
   * Caisse de munitions : recomplète la réserve de l'arme PRINCIPALE au niveau
   * de l'achat — même si on tient le pistolet. False si pas d'arme principale.
   */
  refillMainWeaponAmmo(): boolean {
    if (this.weapons.length < 2) return false;
    const slot = this.weapons[1];
    slot.reserveAmmo = this.fullReserve(slot.def);
    return true;
  }

  /** Rachat de chargeurs à la caisse : réserve remplie au maximum. */
  refillAmmo(weaponId: string): void {
    const slot = this.weapons.find(w => w.def.id === weaponId);
    if (!slot) return;
    slot.reserveAmmo = this.fullReserve(slot.def);
  }

  private handleSwitch(): void {
    if (this.weapons.length < 2) return;
    if (!Phaser.Input.Keyboard.JustDown(this.keys.switch)) return;

    this.currentWeapon = (this.currentWeapon + 1) % this.weapons.length;
    this.isReloading = false; // changer d'arme annule le rechargement en cours
    this.lastFired = 0;
  }

  // ---------------------------------------------------------------- visuel

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = 32;
    const ratio = this.stats.hp / this.stats.maxHp;

    // Fond rouge
    this.hpBar.fillStyle(0x880000);
    this.hpBar.fillRect(-w / 2, -24, w, 4);

    // Barre verte
    this.hpBar.fillStyle(0x00e676);
    this.hpBar.fillRect(-w / 2, -24, w * ratio, 4);
  }

  private drawReloadBar(time: number): void {
    this.reloadBar.clear();
    if (!this.isReloading) return;

    const w = 32;
    const progress = Phaser.Math.Clamp(
      (time - this.reloadStarted) / this.weapon.def.reloadTime,
      0,
      1
    );

    this.reloadBar.fillStyle(0x333333);
    this.reloadBar.fillRect(-w / 2, -18, w, 3);
    this.reloadBar.fillStyle(0xffdd00);
    this.reloadBar.fillRect(-w / 2, -18, w * progress, 3);
  }

  // ---------------------------------------------------------------- update

  update(time: number, delta: number, pointer: Phaser.Input.Pointer): void {
    if (this.isDead) return;

    // Recalcule les coordonnées MONDE du pointeur depuis la caméra courante.
    // Sans ça, worldX/worldY ne sont rafraîchis qu'au mouvement de la souris :
    // quand la caméra bouge (lancement, scrolling), la visée reste périmée
    // (bug du perso bloqué « regard à gauche » après un refresh).
    pointer.updateWorldPoint(this.scene.cameras.main);

    this.handleRotation(pointer);
    this.updateBullets(delta);
    this.drawReloadBar(time);

    // Verrou de début de partie : viser ok, mais ni tir ni déplacement
    if (time < this.controlsLockedUntil) {
      this.body.setVelocity(0, 0);
      if (pointer.isDown) this.pointerReleased = false; // oblige à relâcher le clic
      return;
    }

    this.handleMovement();
    this.handleRegen(time, delta);
    this.handleSwitch();
    this.handleReload(time);
    this.handleShooting(time, pointer);
  }

  private handleMovement(): void {
    // L'arme portée pèse sur la mobilité (le FM 24/29 ralentit nettement)
    const speed = this.stats.speed * this.weapon.def.speedMultiplier;
    this.body.setVelocity(0, 0);

    const left = this.keys.left.isDown;
    const right = this.keys.right.isDown;
    const up = this.keys.up.isDown;
    const down = this.keys.down.isDown;

    if (left) this.body.setVelocityX(-speed);
    else if (right) this.body.setVelocityX(speed);

    if (up) this.body.setVelocityY(-speed);
    else if (down) this.body.setVelocityY(speed);

    // Normaliser la diagonale
    if ((left || right) && (up || down)) {
      this.body.velocity.normalize().scale(speed);
    }
  }

  private handleRotation(pointer: Phaser.Input.Pointer): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    this.setRotation(angle);
  }

  /** Régénération : remonte au max quelques secondes après le dernier hit. */
  private handleRegen(time: number, delta: number): void {
    if (this.stats.hp >= this.stats.maxHp) return;
    if (time - this.lastDamageTime < Player.REGEN_DELAY) return;

    this.stats.hp = Math.min(
      this.stats.maxHp,
      this.stats.hp + (Player.REGEN_RATE * delta) / 1000
    );
    this.drawHpBar();
  }

  private handleReload(time: number): void {
    // Fin de rechargement : prélever sur la réserve
    if (this.isReloading) {
      if (time - this.reloadStarted >= this.weapon.def.reloadTime) {
        this.isReloading = false;
        const w = this.weapon;
        const needed = w.def.magazineSize - w.currentAmmo;
        if (w.reserveAmmo < 0) {
          // Réserve illimitée (pistolet)
          w.currentAmmo = w.def.magazineSize;
        } else {
          const taken = Math.min(needed, w.reserveAmmo);
          w.currentAmmo += taken;
          w.reserveAmmo -= taken;
        }
      }
      return;
    }

    // Rechargement manuel (R)
    if (Phaser.Input.Keyboard.JustDown(this.keys.reload)) {
      this.startReload(time);
    }
  }

  /** Lance le rechargement si possible (chargeur non plein ET réserve dispo). */
  private startReload(time: number): void {
    const w = this.weapon;
    if (this.isReloading) return;
    if (w.currentAmmo >= w.def.magazineSize) return;
    if (w.reserveAmmo === 0) return; // à sec : il faut racheter des chargeurs

    this.isReloading = true;
    this.reloadStarted = time;
  }

  private handleShooting(time: number, pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) {
      this.pointerReleased = true;
      return;
    }
    if (this.isReloading) return;

    const w = this.weapon;

    // Semi-auto : un clic = un tir
    if (!w.def.auto && !this.pointerReleased) return;
    if (time - this.lastFired < w.def.fireRate) return;

    // Chargeur vide → rechargement auto
    if (w.currentAmmo <= 0) {
      this.startReload(time);
      return;
    }

    this.lastFired = time;
    this.pointerReleased = false;
    w.currentAmmo--;

    // Recharge automatique dès que le chargeur est vide
    if (w.currentAmmo === 0) {
      this.startReload(time);
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      pointer.worldX,
      pointer.worldY
    );

    // Gerbe : N projectiles répartis dans le cône de dispersion
    for (let i = 0; i < w.def.pellets; i++) {
      let angle = baseAngle;
      if (w.def.pellets > 1) {
        const half = Phaser.Math.DegToRad(w.def.spreadDeg) / 2;
        angle = baseAngle + Phaser.Math.FloatBetween(-half, half);
      }
      const bullet = new Bullet(this.scene, this.x, this.y, w.def.damage, w.def.bulletLifespan);
      bullet.fire(angle, w.def.bulletSpeed);
      this.bullets.push(bullet);
    }
  }

  private updateBullets(delta: number): void {
    this.bullets = this.bullets.filter(b => {
      if (!b.active) return false;
      b.update(delta);
      return b.active;
    });
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;

    this.lastDamageTime = this.scene.time.now;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.drawHpBar();

    // Flash rouge
    this.scene.tweens.add({
      targets: this.body_rect,
      fillColor: 0xff1744,
      duration: 80,
      yoyo: true,
    });

    if (this.stats.hp <= 0) this.die();
  }

  private die(): void {
    this.isDead = true;
    this.scene.events.emit('playerDead');
  }

  getHp(): number { return this.stats.hp; }
  getMaxHp(): number { return this.stats.maxHp; }
  isAlive(): boolean { return !this.isDead; }
  getAmmo(): number { return this.weapon.currentAmmo; }
  getMagazineSize(): number { return this.weapon.def.magazineSize; }
  getWeaponName(): string { return this.weapon.def.name; }
  getWeaponCategory(): string { return this.weapon.def.category; }
  /** Réserve de l'arme tenue (-1 = illimitée). */
  getReserveAmmo(): number { return this.weapon.reserveAmmo; }
  isReloadingNow(): boolean { return this.isReloading; }
}
