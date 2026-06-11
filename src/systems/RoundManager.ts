import Phaser from 'phaser';
import {
  zombiesForRound,
  spawnIntervalForRound,
  MAX_ZOMBIES_ON_SCREEN,
  INTERMISSION_DURATION,
} from '../config/zombies.config';

/**
 * Gère le cycle des manches :
 * manche en cours (spawn progressif) → dernier zombie tué → accalmie → manche suivante.
 * Émet sur scene.events : 'roundStarted' (n° de manche) et 'roundEnded' (n° de manche).
 */
export class RoundManager {
  private round: number = 0;
  private remainingToSpawn: number = 0;
  private inIntermission: boolean = false;
  private intermissionTimer: number = 0;
  private spawnAccumulator: number = 0;

  constructor(
    private scene: Phaser.Scene,
    private spawnZombie: () => void,
    private getAliveCount: () => number
  ) {}

  /** Lance la manche 1. */
  start(): void {
    this.nextRound();
  }

  getRound(): number {
    return this.round;
  }

  isIntermission(): boolean {
    return this.inIntermission;
  }

  update(_time: number, delta: number): void {
    if (this.round === 0) return;

    // Accalmie entre deux manches
    if (this.inIntermission) {
      this.intermissionTimer -= delta;
      if (this.intermissionTimer <= 0) this.nextRound();
      return;
    }

    // Spawn progressif, plafonné en simultané
    if (this.remainingToSpawn > 0) {
      this.spawnAccumulator += delta;
      if (
        this.spawnAccumulator >= spawnIntervalForRound(this.round) &&
        this.getAliveCount() < MAX_ZOMBIES_ON_SCREEN
      ) {
        this.spawnAccumulator = 0;
        this.remainingToSpawn--;
        this.spawnZombie();
      }
      return;
    }

    // Tout est spawné : la manche se termine quand le dernier zombie tombe
    if (this.getAliveCount() === 0) {
      this.inIntermission = true;
      this.intermissionTimer = INTERMISSION_DURATION;
      this.scene.events.emit('roundEnded', this.round);
    }
  }

  private nextRound(): void {
    this.round++;
    this.inIntermission = false;
    this.remainingToSpawn = zombiesForRound(this.round);
    this.spawnAccumulator = spawnIntervalForRound(this.round); // premier spawn immédiat
    this.scene.events.emit('roundStarted', this.round);
  }
}
