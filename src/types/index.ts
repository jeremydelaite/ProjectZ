export interface Stats {
  hp: number;
  maxHp: number;
  speed: number;
}

export interface WeaponStats {
  damage: number;
  fireRate: number;   // ms entre chaque tir
  bulletSpeed: number;
  magazineSize: number;
  currentAmmo: number;
}
