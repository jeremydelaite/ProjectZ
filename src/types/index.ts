export interface Stats {
  hp: number;
  maxHp: number;
  speed: number;
}

export interface ZombieStats {
  kind: 'fantassin' | 'coureur' | 'ss' | 'gaze';
  hp: number;
  speed: number;
  damage: number;
  attackCooldown: number; // ms entre deux coups
}

export interface WeaponStats {
  damage: number;
  fireRate: number;   // ms entre chaque tir
  bulletSpeed: number;
  magazineSize: number;
  currentAmmo: number;
  reloadTime: number; // ms pour changer de chargeur (réserve illimitée)
}
