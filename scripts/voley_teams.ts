// ---------------- Types ----------------
type Gender = "M" | "F";
export type WeightsTuple = [number, number, number, number, number, number];

interface Categories {
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
  mood?: number;
  categories: Categories;
}

interface PlayerVec {
  total: number;      // score global (pondéré + mood)
  vec: number[];      // catégories pondérées
  baseTotal: number;  // sans mood (pondéré)
  moodNorm: number;   // [-1..+1]
  smashRaw: number;   // smash non pondéré
}

export interface Team {
  members: Player[];
  total: number;
  baseTotal: number;
  catSums: number[];
  women: number;
  moodSum: number;
}

export interface BuildOptions {
  numTeams?: number;
  weights?: WeightsTuple;
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
  attackPriorityFactor?: number;

  maleSeedStrategy?: "smash" | "weighted" | "blend";
  maleSeedSmashBias?: number; // 0..1
}

// ---------------- Utils ----------------
export const DEFAULT_WEIGHTS: WeightsTuple = [2, 3, 3, 6, 2, 3];

function assertRange(v: number, lo: number, hi: number, msg: string) {
  if (typeof v !== "number" || v < lo || v > hi) throw new Error(msg);
}

function moodNorm(mood: number): number {
  assertRange(mood, 1, 10, "mood doit être 1..10");
  return (mood - 5.5) / 4.5;
}

function playerVectorStrength(
  p: Player,
  weights: WeightsTuple,
  moodWeight: number
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
  const total = baseTotal * (1 + moodWeight * moodNorm(m));
  return { total, vec: vecWeighted, baseTotal, moodNorm: moodNorm(m), smashRaw: p.categories.smash };
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
  attackPriorityFactor: number
): number {
  const k = teams.length;

  // Variance des totaux moyens par joueur
  const totalsAvg = teams.map(t => (t.members.length ? t.total / t.members.length : 0));
  const meanTot = totalsAvg.reduce((a, b) => a + b, 0) / k;
  const varTotals = totalsAvg.reduce((a, s) => a + (s - meanTot) ** 2, 0) / k;

  // Variance des catégories (moyennes par joueur)
  let varCatsNorm = 0;
  if (lambdaCat > 0) {
    let acc = 0;
    let wsum = 0;
    for (let c = 0; c < weights.length; c++) {
      const avgs = teams.map(t => (t.members.length ? t.catSums[c] / t.members.length : 0));
      const m = avgs.reduce((a, b) => a + b, 0) / k;
      const vc = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;

      let wc = (weights[c] ?? 1) ** 2;
      if (c === 3) wc *= attackPriorityFactor; // smash prioritaire
      acc += wc * vc;
      wsum += wc;
    }
    varCatsNorm = acc / (wsum || 1);
  }

  // Variance du mood
  let varMood = 0;
  if (lambdaMood > 0) {
    const avgs = teams.map(t => (t.members.length ? t.moodSum / t.members.length : 0));
    const m = avgs.reduce((a, b) => a + b, 0) / k;
    varMood = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;
  }

  return varTotals + lambdaCat * varCatsNorm + lambdaMood * varMood;
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
    femaleFirst = true,
    attackPriorityFactor = 2,
    maleSeedStrategy = "blend",
    maleSeedSmashBias = 0.5,
  } = opts;

  if (!numTeams) throw new Error("Spécifie numTeams (le nombre d'équipes).");

  const K = Math.max(2, numTeams);
  const N = players.length;

  const base = Math.floor(N / K);
  const rem = N % K;
  const targetSizes = Array.from({ length: K }, (_, i) => base + (i < rem ? 1 : 0));

  const metaAll = players.map(p => ({ p, pv: playerVectorStrength(p, weights, moodWeight) }));
  const females = metaAll.filter(x => x.p.gender === "F");
  

  // Cibles femmes
  const targetWomen: number[] = Array<number>(K).fill(0);
  if (femaleFirst && females.length > 0) {
    const baseF = Math.floor(females.length / K);
    const remF = females.length % K;
    for (let i = 0; i < K; i++) targetWomen[i] = baseF + (i < remF ? 1 : 0);
  }

  const teams: Team[] = Array.from({ length: K }, () => emptyTeam(6));

  // 1) Seed FEMMES par score pondéré global, GREEDY small-first
  if (femaleFirst && females.length > 0) {
    const femSorted = [...females].sort((a, b) => b.pv.baseTotal - a.pv.baseTotal);
    const femaleStrengthSum = Array<number>(K).fill(0);

    const teamHasFemaleCapacity = (t: number) => {
      return targetWomen[t] > 0 ? teams[t].women < targetWomen[t] : true;
    };

    for (const f of femSorted) {
      const pool: number[] = [];
      for (let t = 0; t < K; t++) {
        const sizeOk = teams[t].members.length < targetSizes[t];
        const womenOk = teamHasFemaleCapacity(t);
        if (sizeOk && womenOk) pool.push(t);
      }
      if (pool.length === 0) {
        for (let t = 0; t < K; t++) {
          if (teams[t].members.length < targetSizes[t]) pool.push(t);
        }
      }
      const pick = pool.sort((a, b) => {
        const dTarget = targetSizes[a] - targetSizes[b];
        if (dTarget !== 0) return dTarget;
        const dFem = femaleStrengthSum[a] - femaleStrengthSum[b];
        if (dFem !== 0) return dFem;
        return teams[a].members.length - teams[b].members.length;
      })[0] ?? 0;

      addToTeam(teams[pick], f.p, f.pv);
      femaleStrengthSum[pick] += f.pv.baseTotal;
    }
  }

  // 2) Seed HOMMES selon stratégie
  const malesLeft = metaAll.filter(x => !teams.some(T => T.members.some(m => m.id === x.p.id)));
  const bias = Math.min(1, Math.max(0, maleSeedSmashBias)); // clamp 0..1
  let metricFn: (x: { p: Player; pv: PlayerVec }) => number;
  if (maleSeedStrategy === "smash") {
    metricFn = (x) => x.pv.smashRaw;
  } else if (maleSeedStrategy === "weighted") {
    metricFn = (x) => x.pv.baseTotal;
  } else {
    metricFn = (x) => (1 - bias) * x.pv.baseTotal + bias * x.pv.vec[3]; // vec[3] = smash pondéré
  }
  seedByMetricSerpentine(teams, malesLeft, targetSizes, metricFn);

  // 3) Swaps intra-genre
  let bestCost = computeCost(teams, lambdaCat, weights, lambdaMood, attackPriorityFactor);
  const pvById = new Map<string, PlayerVec>(metaAll.map(x => [x.p.id, x.pv]));

  const pickIndexTeamWithGender = (t: Team, g: Gender): number => {
    const idxs: number[] = [];
    t.members.forEach((m, i) => { if (m.gender === g) idxs.push(i); });
    if (idxs.length === 0) return -1;
    return idxs[Math.floor(Math.random() * idxs.length)];
  };

  for (let it = 0; it < swapIterations; it++) {
    const a = Math.floor(Math.random() * K);
    let b = Math.floor(Math.random() * K);
    if (a === b) b = (b + 1) % K;

    const ta = teams[a], tb = teams[b];
    if (ta.members.length === 0 || tb.members.length === 0) continue;

    const genre: Gender = Math.random() < 0.5 ? "F" : "M";
    const ia = pickIndexTeamWithGender(ta, genre);
    const ib = pickIndexTeamWithGender(tb, genre);
    if (ia === -1 || ib === -1) continue;

    const pa = ta.members[ia];
    const pb = tb.members[ib];
    const pva = pvById.get(pa.id)!;
    const pvb = pvById.get(pb.id)!;

    removeFromTeam(ta, ia, pva);
    removeFromTeam(tb, ib, pvb);
    addToTeam(ta, pb, pvb);
    addToTeam(tb, pa, pva);

    const newCost = computeCost(teams, lambdaCat, weights, lambdaMood, attackPriorityFactor);
    if (newCost <= bestCost) {
      bestCost = newCost;
    } else {
      removeFromTeam(ta, ta.members.length - 1, pvb);
      removeFromTeam(tb, tb.members.length - 1, pva);
      addToTeam(ta, pa, pva);
      addToTeam(tb, pb, pvb);
    }
  }

  return teams;
}

// ---------------- Front helpers ----------------
export type FrontWeights = WeightsTuple;
export type FrontBuildOptions = BuildOptions

export function buildTeamsFromPlayers(players: Player[], opts: FrontBuildOptions = {}) {
  const normalized: BuildOptions = {
    weights: opts.weights ?? DEFAULT_WEIGHTS,
    lambdaCat: opts.lambdaCat ?? 0.5,
    lambdaMood: opts.lambdaMood ?? 0.3,
    moodWeight: opts.moodWeight ?? 0.15,
    swapIterations: opts.swapIterations ?? 5000,
    femaleFirst: opts.femaleFirst ?? true,
    attackPriorityFactor: opts.attackPriorityFactor ?? 2,
    maleSeedStrategy: opts.maleSeedStrategy ?? "blend",
    maleSeedSmashBias: opts.maleSeedSmashBias ?? 0.5,
    ...(opts.numTeams ? { numTeams: opts.numTeams } : { numTeams: 2 }),
  };
  return buildBalancedMixedTeams(players, normalized);
}

export function buildTeamsFromJsonString(jsonString: string, opts: FrontBuildOptions = {}) {
  const players = JSON.parse(jsonString) as Player[];
  return buildTeamsFromPlayers(players, opts);
}