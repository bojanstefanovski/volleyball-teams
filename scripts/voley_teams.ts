// ---------------- Types ----------------
export type Gender = "M" | "F";
export type WeightsTuple = [number, number, number, number, number, number];

export interface Categories {
  service: number;
  reception: number;
  passing: number;
  smash: number;
  defence: number;
  bloc: number;
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  mood?: number; // 1..10 (optional, defaults to 5.5 if absent)
  categories: Categories; // each 1..10
}

interface PlayerVec {
  total: number;      // global weighted score with mood
  vec: number[];      // weighted categories (length 6)
  baseTotal: number;  // weighted sum without mood
  moodNorm: number;   // [-1..+1]
  smashRaw: number;   // unweighted smash (raw 1..10)
}

export interface Team {
  members: Player[];
  total: number;      // sum of pv.total for members
  baseTotal: number;  // sum of pv.baseTotal
  catSums: number[];  // sum of weighted categories across members
  women: number;      // count of F
  moodSum: number;    // sum of moodNorm across members
}

export interface PlayerConstraint {
  playerIds: string[]; // IDs des joueurs qui doivent jouer ensemble
  label?: string; // Label optionnel pour identifier la contrainte
  targetTeam?: number; // Numéro de l'équipe cible (1-based, optionnel)
  preferredTeamSize?: number; // Taille d'équipe préférée (4, 5 ou 6 joueurs)
}

export interface PerformanceStats {
  [playerId: string]: {
    winrate: number;
    played: number;
  };
}

export interface BuildOptions {
  numTeams?: number;
  weights?: WeightsTuple;
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  /** Nombre de relances indépendantes de l'optimisation (on garde la meilleure) */
  restarts?: number;
  femaleFirst?: boolean;
  attackPriorityFactor?: number;

  maleSeedStrategy?: "smash" | "weighted" | "blend";
  maleSeedSmashBias?: number; // 0..1

  /** Control how balance is computed across teams */
  balanceMode?: "overall" | "perCategory" | "hybrid";
  /** In hybrid: 0 = 100% per-category, 1 = 100% overall */
  hybridAlpha?: number;
  
  /** Contraintes pour forcer des joueurs à jouer ensemble */
  constraints?: PlayerConstraint[];
  
  /** Statistiques de performance historiques des joueurs */
  performanceStats?: PerformanceStats;
  /** Poids du facteur de performance (0..1, défaut 0.2) */
  performanceWeight?: number;
}

export interface RankedPlayer extends Player {
  score: number;      // global weighted score (with mood)
  baseTotal: number;  // weighted (optionally average-normalized) score without mood
  moodNorm: number;   // [-1..+1]
  rank: number;
}

// ---------------- Defaults ----------------
export const DEFAULT_WEIGHTS: WeightsTuple = [2, 3, 3, 5, 2, 3];

// ---------------- Utils ----------------
function assertRange(v: number, lo: number, hi: number, msg: string) {
  if (typeof v !== "number" || v < lo || v > hi) throw new Error(msg);
}

function moodNorm(mood: number): number {
  assertRange(mood, 1, 10, "mood doit être 1..10");
  return (mood - 5.5) / 4.5; // maps 1..10 -> approx [-1..+1]
}

function playerVectorStrength(
  p: Player,
  weights: WeightsTuple,
  moodWeight: number,
  performanceStats?: PerformanceStats,
  performanceWeight = 0.2
): PlayerVec {
  const raw: number[] = [
    p.categories.service,
    p.categories.reception,
    p.categories.passing,
    p.categories.smash,
    p.categories.defence,
    p.categories.bloc,
  ];
  raw.forEach((v, i) => assertRange(v, 1, 10, `Catégorie #${i} de ${p.name} doit être 1..10`));
  if (p.mood !== undefined) assertRange(p.mood, 1, 10, `mood de ${p.name} doit être 1..10`);

  const vecWeighted = raw.map((v, i) => v * (weights[i] ?? 1));
  const baseTotal = vecWeighted.reduce((a, b) => a + b, 0);
  const m = p.mood ?? 5.5;
  
  // Intégrer les statistiques de performance si disponibles
  let performanceFactor = 1;
  if (performanceStats && performanceStats[p.id]) {
    const stats = performanceStats[p.id];
    // Si le joueur a joué au moins 3 matchs, on utilise son winrate
    // Le winrate (0..1) est converti en facteur de performance (-1..+1)
    // winrate 0.5 (50%) = facteur neutre (0)
    // winrate 1.0 (100%) = facteur +1
    // winrate 0.0 (0%) = facteur -1
    if (stats.played >= 3) {
      const performanceBonus = (stats.winrate - 0.5) * 2; // maps 0..1 to -1..+1
      performanceFactor = 1 + performanceWeight * performanceBonus;
    }
  }
  
  const total = baseTotal * performanceFactor * (1 + moodWeight * moodNorm(m));

  return {
    total,
    // le facteur de performance s'applique aussi aux catégories, sinon il est ignoré en mode perCategory
    vec: vecWeighted.map(v => v * performanceFactor),
    baseTotal: baseTotal * performanceFactor,
    moodNorm: moodNorm(m),
    smashRaw: p.categories.smash,
  };
}

function emptyTeam(k = 6): Team {
  return { members: [], total: 0, baseTotal: 0, catSums: Array(k).fill(0), women: 0, moodSum: 0 };
}

function addToTeam(team: Team, player: Player, pv: PlayerVec): void {
  team.members.push(player);
  team.total += pv.total;
  team.baseTotal += pv.baseTotal;
  for (let i = 0; i < team.catSums.length; i++) team.catSums[i] += pv.vec[i];
  if (player.gender === "F") team.women++;
  team.moodSum += pv.moodNorm;
}

function removeFromTeam(team: Team, idx: number, pv: PlayerVec): Player {
  const p = team.members[idx];
  team.members.splice(idx, 1);
  team.total -= pv.total;
  team.baseTotal -= pv.baseTotal;
  for (let i = 0; i < team.catSums.length; i++) team.catSums[i] -= pv.vec[i];
  if (p.gender === "F") team.women--;
  team.moodSum -= pv.moodNorm;
  return p;
}

// ---------------- Cost ----------------
export function computeCost(
  teams: Team[],
  lambdaCat: number,
  weights: WeightsTuple,
  lambdaMood: number,
  attackPriorityFactor: number,
  balanceMode: "overall" | "perCategory" | "hybrid" = "perCategory",
  hybridAlpha = 0.3
): number {
  const k = teams.length;

  // (A) variance of per-player global averages
  const totalsAvg = teams.map(t => (t.members.length ? t.total / t.members.length : 0));
  const meanTot = totalsAvg.reduce((a, b) => a + b, 0) / k;
  const varTotals = totalsAvg.reduce((a, s) => a + (s - meanTot) ** 2, 0) / k;

  // (B) variance of per-player category averages
  let varCatsNorm = 0;
  if (lambdaCat > 0) {
    let acc = 0;
    let wsum = 0;
    for (let c = 0; c < weights.length; c++) {
      const avgs = teams.map(t => (t.members.length ? t.catSums[c] / t.members.length : 0));
      const m = avgs.reduce((a, b) => a + b, 0) / k;
      const vc = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;

      let wc = (weights[c] ?? 1) ** 2;
      if (c === 3) wc *= attackPriorityFactor; // prioritize smash if desired
      acc += wc * vc;
      wsum += wc;
    }
    varCatsNorm = acc / (wsum || 1);
  }

  // (C) variance of per-player mood averages
  let varMood = 0;
  if (lambdaMood > 0) {
    const avgs = teams.map(t => (t.members.length ? t.moodSum / t.members.length : 0));
    const m = avgs.reduce((a, b) => a + b, 0) / k;
    varMood = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;
  }

  // (D) combine according to balanceMode
  const costOverall = varTotals;
  const costPerCat = lambdaCat * varCatsNorm;

  let combinedGlobal: number;
  if (balanceMode === "overall") {
    combinedGlobal = costOverall + costPerCat * 0.2;
  } else if (balanceMode === "perCategory") {
    combinedGlobal = costPerCat + costOverall * 0.2;
  } else {
    const alpha = Math.max(0, Math.min(1, hybridAlpha));
    combinedGlobal = alpha * costOverall + (1 - alpha) * costPerCat;
  }

  return combinedGlobal + lambdaMood * varMood;
}

// ---------------- Seeding helpers ----------------
function seedByMetricSerpentine(
  teams: Team[],
  meta: Array<{ p: Player; pv: PlayerVec }>,
  targetSizes: number[],
  metric: (x: { p: Player; pv: PlayerVec }) => number
) {
  meta.sort((a, b) => metric(b) - metric(a));
  let forward = true;
  let i = 0;

  for (const item of meta) {
    let placed = false;
    let tries = 0;

    while (!placed && tries < teams.length * 2) {
      const idx = Math.max(0, Math.min(i, teams.length - 1));
      if (teams[idx].members.length < targetSizes[idx]) {
        addToTeam(teams[idx], item.p, item.pv);
        placed = true;
      }
      if (forward) {
        i++;
        if (i >= teams.length) { i = teams.length - 1; forward = false; }
      } else {
        i--;
        if (i < 0) { i = 0; forward = true; }
      }
      tries++;
    }

    if (!placed) {
      let bestI = 0, bestLen = Infinity;
      for (let t = 0; t < teams.length; t++) {
        if (teams[t].members.length < bestLen) { bestLen = teams[t].members.length; bestI = t; }
      }
      addToTeam(teams[bestI], item.p, item.pv);
    }
  }
}

// ---------------- Core Algorithm ----------------
export function buildBalancedMixedTeams(players: Player[], opts: BuildOptions = {}): Team[] {
  const {
    numTeams,
    weights = DEFAULT_WEIGHTS,
    lambdaCat = 0.5,
    lambdaMood = 0.3,
    moodWeight = 0.15,
    swapIterations = 5000,
    restarts = 6,
    femaleFirst = true,
    attackPriorityFactor = 2,
    maleSeedStrategy = "blend",
    maleSeedSmashBias = 0.5,

    balanceMode = "perCategory",
    hybridAlpha = 0.3,
    constraints = [],
    performanceStats,
    performanceWeight = 0.2,
  } = opts;

  if (!numTeams) throw new Error("Spécifie numTeams (le nombre d'équipes).");

  const K = Math.max(2, numTeams);
  const N = players.length;

  const base = Math.floor(N / K);
  const rem = N % K;
  const targetSizes = Array.from({ length: K }, (_, i) => base + (i < rem ? 1 : 0));

  // Pre-compute player vectors with performance stats
  const metaAll = players.map(p => ({ 
    p, 
    pv: playerVectorStrength(p, weights, moodWeight, performanceStats, performanceWeight) 
  }));
  const females = metaAll.filter(x => x.p.gender === "F");

  const teams: Team[] = Array.from({ length: K }, () => emptyTeam(6));

  // (0) Handle constraints - place constrained players together first
  const constrainedPlayerIds = new Set<string>();
  if (constraints && constraints.length > 0) {
    for (const constraint of constraints) {
      // Validate constraint
      if (!constraint.playerIds || constraint.playerIds.length < 2) {
        console.warn(`Contrainte ignorée: doit contenir au moins 2 joueurs`, constraint);
        continue;
      }

      // Get players for this constraint
      const constraintPlayers = constraint.playerIds
        .map(id => metaAll.find(m => m.p.id === id))
        .filter(Boolean) as Array<{ p: Player; pv: PlayerVec }>;

      if (constraintPlayers.length !== constraint.playerIds.length) {
        console.warn(`Contrainte ignorée: certains joueurs n'ont pas été trouvés`, constraint);
        continue;
      }

      let bestTeamIdx = -1;

      // If targetTeam is specified, try to use it
      if (constraint.targetTeam !== undefined && constraint.targetTeam >= 1 && constraint.targetTeam <= K) {
        const targetIdx = constraint.targetTeam - 1; // Convert 1-based to 0-based
        const spaceLeft = targetSizes[targetIdx] - teams[targetIdx].members.length;
        
        if (spaceLeft >= constraintPlayers.length) {
          bestTeamIdx = targetIdx;
        } else {
          console.warn(`Équipe ${constraint.targetTeam} n'a pas assez d'espace pour la contrainte "${constraint.label || 'sans nom'}". Recherche d'une autre équipe...`);
        }
      }

      // If preferredTeamSize is specified, try to find a team with that target size
      if (bestTeamIdx === -1 && constraint.preferredTeamSize !== undefined) {
        const preferredSize = constraint.preferredTeamSize;
        let bestMatch = -1;
        let bestSizeDiff = Infinity;

        for (let t = 0; t < K; t++) {
          const spaceLeft = targetSizes[t] - teams[t].members.length;
          if (spaceLeft >= constraintPlayers.length) {
            // Check if this team's target size matches the preferred size
            const sizeDiff = Math.abs(targetSizes[t] - preferredSize);
            if (sizeDiff < bestSizeDiff) {
              bestSizeDiff = sizeDiff;
              bestMatch = t;
            }
          }
        }

        if (bestMatch !== -1) {
          bestTeamIdx = bestMatch;
        }
      }

      // If no target team/size or not found, pick the weakest team (per slot) that has room
      if (bestTeamIdx === -1) {
        let bestStrength = Infinity;
        for (let t = 0; t < K; t++) {
          const spaceLeft = targetSizes[t] - teams[t].members.length;
          if (spaceLeft < constraintPlayers.length) continue;
          const strength = teams[t].baseTotal / targetSizes[t];
          if (strength < bestStrength) {
            bestStrength = strength;
            bestTeamIdx = t;
          }
        }
      }

      if (bestTeamIdx === -1) {
        console.warn(`Impossible de placer la contrainte: pas assez d'espace dans les équipes`, constraint);
        continue;
      }

      // Add all constrained players to the same team
      for (const cp of constraintPlayers) {
        addToTeam(teams[bestTeamIdx], cp.p, cp.pv);
        constrainedPlayerIds.add(cp.p.id);
      }
    }
  }

  // (1) Seed females first.
  // Répartition cible: chaque femme va à l'équipe qui en a le moins; à égalité,
  // la plus grande équipe d'abord. Les femmes placées par contrainte comptent déjà.
  if (femaleFirst && females.length > 0) {
    const femalesNotConstrained = females.filter(f => !constrainedPlayerIds.has(f.p.id));

    const targetWomen = teams.map(t => t.women);
    const room = teams.map((t, i) => targetSizes[i] - t.members.length);
    for (let n = 0; n < femalesNotConstrained.length; n++) {
      let pick = -1;
      for (let t = 0; t < K; t++) {
        if (room[t] <= 0) continue;
        if (
          pick === -1 ||
          targetWomen[t] < targetWomen[pick] ||
          (targetWomen[t] === targetWomen[pick] && targetSizes[t] > targetSizes[pick])
        ) pick = t;
      }
      if (pick === -1) break;
      targetWomen[pick]++;
      room[pick]--;
    }

    // Les plus fortes d'abord, chacune vers l'équipe (avec place) dont les femmes sont les moins fortes
    const femSorted = [...femalesNotConstrained].sort((a, b) => b.pv.baseTotal - a.pv.baseTotal);
    const femaleStrengthSum = Array<number>(K).fill(0);
    for (const f of femSorted) {
      let pick = -1;
      for (let t = 0; t < K; t++) {
        if (teams[t].women >= targetWomen[t]) continue;
        if (pick === -1 || femaleStrengthSum[t] < femaleStrengthSum[pick]) pick = t;
      }
      if (pick === -1) break;
      addToTeam(teams[pick], f.p, f.pv);
      femaleStrengthSum[pick] += f.pv.baseTotal;
    }
  }

  // (2) Seed males according to strategy (excluding already placed constrained players)
  const malesLeft = metaAll.filter(x =>
    !teams.some(T => T.members.some(m => m.id === x.p.id)) &&
    !constrainedPlayerIds.has(x.p.id)
  );
  const bias = Math.min(1, Math.max(0, maleSeedSmashBias));
  let metricFn: (x: { p: Player; pv: PlayerVec }) => number;
  if (maleSeedStrategy === "smash") {
    metricFn = (x) => x.pv.smashRaw;
  } else if (maleSeedStrategy === "weighted") {
    metricFn = (x) => x.pv.baseTotal;
  } else {
    // blend: mix of baseTotal and weighted smash
    metricFn = (x) => (1 - bias) * x.pv.baseTotal + bias * x.pv.vec[3];
  }
  seedByMetricSerpentine(teams, malesLeft, targetSizes, metricFn);

  // (3) Optimisation: recuit simulé puis descente exhaustive sur les échanges, avec relances
  const pvById = new Map<string, PlayerVec>(metaAll.map(x => [x.p.id, x.pv]));
  const cost = (ts: Team[]) =>
    computeCost(ts, lambdaCat, weights, lambdaMood, attackPriorityFactor, balanceMode, hybridAlpha);

  const rebuild = (groups: Player[][]): Team[] =>
    groups.map(g => {
      const t = emptyTeam(6);
      for (const p of g) addToTeam(t, p, pvById.get(p.id)!);
      return t;
    });

  const seedGroups = teams.map(t => [...t.members]);
  let best = rebuild(seedGroups);
  let bestCost = cost(best);

  for (let r = 0; r < Math.max(1, restarts); r++) {
    const current = rebuild(seedGroups);
    const runCost = optimizeSwaps(current, pvById, constrainedPlayerIds, cost, swapIterations);
    if (runCost < bestCost) {
      bestCost = runCost;
      best = current;
    }
  }

  return best;
}

/** Échange les joueurs a (équipe ta) et b (équipe tb) aux indices ia / ib. */
function swapPlayers(ta: Team, ia: number, tb: Team, ib: number, pvById: Map<string, PlayerVec>) {
  const pa = ta.members[ia];
  const pb = tb.members[ib];
  const pva = pvById.get(pa.id)!;
  const pvb = pvById.get(pb.id)!;
  removeFromTeam(ta, ia, pva);
  removeFromTeam(tb, ib, pvb);
  // réinsérer à la même position pour garder les indices stables
  ta.members.splice(ia, 0, pb);
  tb.members.splice(ib, 0, pa);
  addStats(ta, pb, pvb);
  addStats(tb, pa, pva);
}

function addStats(team: Team, player: Player, pv: PlayerVec) {
  team.total += pv.total;
  team.baseTotal += pv.baseTotal;
  for (let i = 0; i < team.catSums.length; i++) team.catSums[i] += pv.vec[i];
  if (player.gender === "F") team.women++;
  team.moodSum += pv.moodNorm;
}

/**
 * Améliore la répartition en place par échanges de joueurs du même genre
 * (les joueurs sous contrainte ne bougent pas). Retourne le coût final.
 */
function optimizeSwaps(
  teams: Team[],
  pvById: Map<string, PlayerVec>,
  locked: Set<string>,
  cost: (ts: Team[]) => number,
  iterations: number
): number {
  const K = teams.length;
  const movable = (p: Player) => !locked.has(p.id);

  let cur = cost(teams);
  let bestCost = cur;
  let bestGroups = teams.map(t => [...t.members]);

  // (a) Recuit simulé: accepte parfois une dégradation pour sortir des minima locaux
  const T0 = Math.max(cur, 1e-6) * 0.05;
  const Tend = T0 * 1e-3;
  for (let it = 0; it < iterations; it++) {
    const T = T0 * Math.pow(Tend / T0, it / Math.max(1, iterations - 1));
    const a = Math.floor(Math.random() * K);
    let b = Math.floor(Math.random() * (K - 1));
    if (b >= a) b++;
    const ta = teams[a], tb = teams[b];
    const ia = Math.floor(Math.random() * ta.members.length);
    if (ia < 0 || !ta.members[ia] || !movable(ta.members[ia])) continue;
    const g = ta.members[ia].gender;
    const candidates: number[] = [];
    tb.members.forEach((m, i) => { if (m.gender === g && movable(m)) candidates.push(i); });
    if (candidates.length === 0) continue;
    const ib = candidates[Math.floor(Math.random() * candidates.length)];

    swapPlayers(ta, ia, tb, ib, pvById);
    const next = cost(teams);
    const delta = next - cur;
    if (delta <= 0 || Math.random() < Math.exp(-delta / T)) {
      cur = next;
      if (cur < bestCost) {
        bestCost = cur;
        bestGroups = teams.map(t => [...t.members]);
      }
    } else {
      swapPlayers(ta, ia, tb, ib, pvById); // revert
    }
  }

  // repartir de la meilleure solution rencontrée
  for (let t = 0; t < K; t++) {
    const fresh = emptyTeam(teams[t].catSums.length);
    for (const p of bestGroups[t]) addToTeam(fresh, p, pvById.get(p.id)!);
    teams[t] = fresh;
  }
  cur = bestCost;

  // (b) Descente exhaustive: essaie tous les échanges jusqu'à ce qu'aucun n'améliore
  let improved = true;
  while (improved) {
    improved = false;
    for (let a = 0; a < K; a++) {
      for (let b = a + 1; b < K; b++) {
        const ta = teams[a], tb = teams[b];
        for (let ia = 0; ia < ta.members.length; ia++) {
          if (!movable(ta.members[ia])) continue;
          for (let ib = 0; ib < tb.members.length; ib++) {
            const pb = tb.members[ib];
            if (pb.gender !== ta.members[ia].gender || !movable(pb)) continue;
            swapPlayers(ta, ia, tb, ib, pvById);
            const next = cost(teams);
            if (next < cur - 1e-12) {
              cur = next;
              improved = true;
            } else {
              swapPlayers(ta, ia, tb, ib, pvById);
            }
          }
        }
      }
    }
  }

  return cur;
}

// ---------------- Front helpers ----------------
export type FrontWeights = WeightsTuple;
export type FrontBuildOptions = BuildOptions;

export function buildTeamsFromPlayers(players: Player[], opts: FrontBuildOptions = {}) {
  const normalized: BuildOptions = {
    weights: opts.weights ?? DEFAULT_WEIGHTS,
    lambdaCat: opts.lambdaCat ?? 0.8,       // slightly higher to emphasize per-category balance
    lambdaMood: opts.lambdaMood ?? 0.2,
    moodWeight: opts.moodWeight ?? 0.15,
    swapIterations: opts.swapIterations ?? 5000,
    femaleFirst: opts.femaleFirst ?? true,
    attackPriorityFactor: opts.attackPriorityFactor ?? 2,
    maleSeedStrategy: opts.maleSeedStrategy ?? "blend",
    maleSeedSmashBias: opts.maleSeedSmashBias ?? 0.5,
    balanceMode: opts.balanceMode ?? "perCategory",
    hybridAlpha: opts.hybridAlpha ?? 0.3,
    ...(opts.numTeams ? { numTeams: opts.numTeams } : { numTeams: 2 }),
  };
  return buildBalancedMixedTeams(players, normalized);
}

export function buildTeamsFromJsonString(jsonString: string, opts: FrontBuildOptions = {}) {
  const players = JSON.parse(jsonString) as Player[];
  return buildTeamsFromPlayers(players, opts);
}

// ---------------- Ranking list ----------------
export function buildRankingList(
  players: Player[],
  weights: WeightsTuple = DEFAULT_WEIGHTS,
  moodWeight = 0.15,
  useWeightedAverage = false, // if true, normalize by sum(weights) for ~1..10 scale
  performanceStats?: PerformanceStats,
  performanceWeight = 0.2
): RankedPlayer[] {
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  const withScores = players.map((p) => {
    const pv = playerVectorStrength(p, weights, moodWeight, performanceStats, performanceWeight);
    const base = useWeightedAverage ? pv.baseTotal / weightSum : pv.baseTotal;
    const total = base * (1 + moodWeight * pv.moodNorm);
    return {
      ...p,
      score: total,
      baseTotal: base,
      moodNorm: pv.moodNorm,
    };
  });

  // Sort: score desc, then smash desc, then mood desc, then name asc
  withScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.categories.smash !== a.categories.smash)
      return b.categories.smash - a.categories.smash;
    if ((b.mood ?? 0) !== (a.mood ?? 0)) return (b.mood ?? 0) - (a.mood ?? 0);
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });

  return withScores.map((p, i) => ({ ...p, rank: i + 1 }));
}
