// Records du joueur, persistés dans le navigateur (localStorage).

const STORAGE_KEY = 'projectz_records';

export interface Records {
  bestRound: number;
  totalKills: number;
  totalPoints: number;
  games: number;
}

export interface GameResult {
  round: number;
  kills: number;
  points: number;
}

const DEFAULTS: Records = {
  bestRound: 0,
  totalKills: 0,
  totalPoints: 0,
  games: 0,
};

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Enregistre une partie terminée et met à jour les records. */
export function registerGame(result: GameResult): Records {
  const records = loadRecords();
  records.bestRound = Math.max(records.bestRound, result.round);
  records.totalKills += result.kills;
  records.totalPoints += result.points;
  records.games += 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // stockage indisponible : tant pis, la partie reste jouable
  }
  return records;
}
