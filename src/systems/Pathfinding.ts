import Phaser from 'phaser';

/**
 * Pathfinding A* sur grille pour les zombies.
 * - Grille de cellules (32 px par défaut), compteur d'obstacles par cellule
 *   (permet d'ajouter/retirer des obstacles qui se chevauchent, ex. débris déblayés).
 * - A* 8 directions sans coupe de coin, heuristique octile.
 * - hasLineOfSight pour la chasse directe quand aucun mur ne gêne.
 */
export class Pathfinder {
  private cols: number;
  private rows: number;
  private cell: number;
  private grid: Uint8Array;

  constructor(width: number, height: number, cellSize: number = 32) {
    this.cell = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.grid = new Uint8Array(this.cols * this.rows);
  }

  private idx(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  private *cellsForRect(x: number, y: number, w: number, h: number): Generator<number> {
    // x/y = centre du rectangle (convention Phaser)
    const minX = Math.max(0, Math.floor((x - w / 2) / this.cell));
    const maxX = Math.min(this.cols - 1, Math.floor((x + w / 2 - 1) / this.cell));
    const minY = Math.max(0, Math.floor((y - h / 2) / this.cell));
    const maxY = Math.min(this.rows - 1, Math.floor((y + h / 2 - 1) / this.cell));
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        yield this.idx(cx, cy);
      }
    }
  }

  addObstacleRect(x: number, y: number, w: number, h: number): void {
    for (const i of this.cellsForRect(x, y, w, h)) {
      if (this.grid[i] < 255) this.grid[i]++;
    }
  }

  removeObstacleRect(x: number, y: number, w: number, h: number): void {
    for (const i of this.cellsForRect(x, y, w, h)) {
      if (this.grid[i] > 0) this.grid[i]--;
    }
  }

  private isBlockedCell(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.grid[this.idx(cx, cy)] > 0;
  }

  isBlockedAt(x: number, y: number): boolean {
    return this.isBlockedCell(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  /** Vrai si le segment ne traverse aucune cellule bloquée (échantillonnage serré). */
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.ceil(dist / (this.cell / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (this.isBlockedAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
    }
    return true;
  }

  /**
   * Chemin en coordonnées monde (centres de cellules), ou null si introuvable.
   * La cellule de départ est toujours considérée libre (un zombie peut être
   * légèrement enfoncé dans un mur au spawn).
   */
  findPath(x1: number, y1: number, x2: number, y2: number): Phaser.Math.Vector2[] | null {
    const sx = Phaser.Math.Clamp(Math.floor(x1 / this.cell), 0, this.cols - 1);
    const sy = Phaser.Math.Clamp(Math.floor(y1 / this.cell), 0, this.rows - 1);
    const gx = Phaser.Math.Clamp(Math.floor(x2 / this.cell), 0, this.cols - 1);
    const gy = Phaser.Math.Clamp(Math.floor(y2 / this.cell), 0, this.rows - 1);

    if (sx === gx && sy === gy) return [];
    if (this.isBlockedCell(gx, gy)) return null;

    const size = this.cols * this.rows;
    const gScore = new Float64Array(size).fill(Infinity);
    const cameFrom = new Int32Array(size).fill(-1);
    const closed = new Uint8Array(size);

    // Tas binaire min sur f
    const heap: number[] = []; // indices de cellules
    const fScore = new Float64Array(size).fill(Infinity);

    const octile = (cx: number, cy: number): number => {
      const dx = Math.abs(cx - gx);
      const dy = Math.abs(cy - gy);
      return 10 * Math.max(dx, dy) + 4 * Math.min(dx, dy);
    };

    const push = (i: number) => {
      heap.push(i);
      let c = heap.length - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (fScore[heap[p]] <= fScore[heap[c]]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };

    const pop = (): number => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let p = 0;
        for (;;) {
          let m = p;
          const l = 2 * p + 1;
          const r = 2 * p + 2;
          if (l < heap.length && fScore[heap[l]] < fScore[heap[m]]) m = l;
          if (r < heap.length && fScore[heap[r]] < fScore[heap[m]]) m = r;
          if (m === p) break;
          [heap[p], heap[m]] = [heap[m], heap[p]];
          p = m;
        }
      }
      return top;
    };

    const start = this.idx(sx, sy);
    const goal = this.idx(gx, gy);
    gScore[start] = 0;
    fScore[start] = octile(sx, sy);
    push(start);

    const DIRS = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    let expansions = 0;
    const MAX_EXPANSIONS = 4000;

    while (heap.length > 0 && expansions < MAX_EXPANSIONS) {
      const current = pop();
      if (current === goal) {
        // Reconstruction
        const path: Phaser.Math.Vector2[] = [];
        let node = goal;
        while (node !== start && node !== -1) {
          const cx = node % this.cols;
          const cy = Math.floor(node / this.cols);
          path.push(new Phaser.Math.Vector2(
            cx * this.cell + this.cell / 2,
            cy * this.cell + this.cell / 2
          ));
          node = cameFrom[node];
        }
        path.reverse();
        return path;
      }
      if (closed[current]) continue;
      closed[current] = 1;
      expansions++;

      const cx = current % this.cols;
      const cy = Math.floor(current / this.cols);

      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (this.isBlockedCell(nx, ny)) continue;
        // Pas de coupe de coin en diagonale
        if (dx !== 0 && dy !== 0) {
          if (this.isBlockedCell(cx + dx, cy) || this.isBlockedCell(cx, cy + dy)) continue;
        }
        const ni = this.idx(nx, ny);
        if (closed[ni]) continue;
        const cost = dx !== 0 && dy !== 0 ? 14 : 10;
        const tentative = gScore[current] + cost;
        if (tentative < gScore[ni]) {
          gScore[ni] = tentative;
          fScore[ni] = tentative + octile(nx, ny);
          cameFrom[ni] = current;
          push(ni);
        }
      }
    }

    return null;
  }
}
