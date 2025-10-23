#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Répartition d'équipes mixtes pour volley (1..10 + mood)
 * - Priorité: équilibrer l'ATTAQUE (smash) sans concentrer les tops dans les équipes de 3
 * - Semis initial: serpentin par smash (F puis M) en respectant les tailles cibles
 * - Coût: variances **normalisées par la taille d'équipe** (moyennes) + boost sur smash
 * - Swaps intra-genre pour affiner
 */

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
  mood?: number; // 1..10
  categories: Categories; // 1..10 (10 = meilleur)
}

interface PlayerVec {
  total: number;      // score global (pondéré + mood)
  vec: number[];      // catégories pondérées
  baseTotal: number;  // sans mood
  moodNorm: number;   // [-1..+1]
  smashRaw: number;   // smash non pondéré, pour trier l'attaque
}

export interface Team {
  members: Player[];
  total: number;
  baseTotal: number;
  catSums: number[]; // sommes pondérées (serv..bloc)
  women: number;
  moodSum: number;
}

export interface BuildOptions {
  numTeams?: number;
  weights?: WeightsTuple;  // [service, reception, passing, smash, defence, bloc]
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
  attackPriorityFactor?: number; // poids spécifique de l’attaque dans le coût (par défaut 2)
}

// ---------------- Utils ----------------
export const DEFAULT_WEIGHTS: WeightsTuple = [2, 3, 3, 6, 2, 3]; // smash déjà un peu boosté

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
  // 10 = meilleur
  const raw: number[] = [
    p.categories.service,
    p.categories.reception,
    p.categories.passing,
    p.categories.smash,
    p.categories.defence,
    p.categories.bloc,
  ];
  // valider 1..10
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

// ---------------- Cost (normalisé par taille d'équipe) ----------------
export function computeCost(
  teams: Team[],
  lambdaCat: number,
  weights: WeightsTuple,
  lambdaMood: number,
  attackPriorityFactor: number
): number {
  const k = teams.length;

  // Variance des TOT en moyenne par joueur (pour neutraliser tailles 3 vs 4)
  const totalsAvg = teams.map(t => (t.members.length ? t.total / t.members.length : 0));
  const meanTot = totalsAvg.reduce((a, b) => a + b, 0) / k;
  const varTotals = totalsAvg.reduce((a, s) => a + (s - meanTot) ** 2, 0) / k;

  // Variance des catégories par MOYENNE (catSums / teamSize)
  let varCatsNorm = 0;
  if (lambdaCat > 0) {
    let acc = 0;
    let wsum = 0;
    for (let c = 0; c < weights.length; c++) {
      const avgs = teams.map(t => (t.members.length ? t.catSums[c] / t.members.length : 0));
      const m = avgs.reduce((a, b) => a + b, 0) / k;
      const vc = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;

      let wc = (weights[c] ?? 1) ** 2;
      // ➜ Smash prioritaire
      if (c === 3) wc *= attackPriorityFactor; // c=3 → smash

      acc += wc * vc;
      wsum += wc;
    }
    varCatsNorm = acc / (wsum || 1);
  }

  // Variance du mood (moyenne aussi)
  let varMood = 0;
  if (lambdaMood > 0) {
    const avgs = teams.map(t => (t.members.length ? t.moodSum / t.members.length : 0));
    const m = avgs.reduce((a, b) => a + b, 0) / k;
    varMood = avgs.reduce((a, x) => a + (x - m) ** 2, 0) / k;
  }

  return varTotals + lambdaCat * varCatsNorm + lambdaMood * varMood;
}

// ---------------- Seeding: serpentin par smash ----------------
function seedBySmashSerpentine(
  teams: Team[],
  meta: Array<{ p: Player; pv: PlayerVec }>,
  targetSizes: number[]
) {
  // Trier par smash (meilleur → pire)
  meta.sort((a, b) => b.pv.smashRaw - a.pv.smashRaw);

  let forward = true;
  let i = 0;
  for (const item of meta) {
    // chercher la prochaine équipe qui n'a pas atteint sa taille cible
    let placed = false;
    let tries = 0;
    while (!placed && tries < teams.length * 2) {
      const idx = Math.max(0, Math.min(i, teams.length - 1));
      if (teams[idx].members.length < targetSizes[idx]) {
        addToTeam(teams[idx], item.p, item.pv);
        placed = true;
      }
      // avancer le serpentin
      if (forward) {
        i++;
        if (i >= teams.length) {
          i = teams.length - 1;
          forward = false;
        }
      } else {
        i--;
        if (i < 0) {
          i = 0;
          forward = true;
        }
      }
      tries++;
    }
    // fallback si tout plein (sécurité)
    if (!placed) {
      let bestI = 0;
      let bestLen = Infinity;
      for (let t = 0; t < teams.length; t++) {
        if (teams[t].members.length < bestLen) {
          bestLen = teams[t].members.length;
          bestI = t;
        }
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
    attackPriorityFactor = 2, // ⇦ réglable
  } = opts;

  if (!numTeams) throw new Error("Spécifie numTeams (le nombre d'équipes).");

  const N = players.length;
  const K = Math.max(2, numTeams);

  // Tailles cibles (diffèrent d'au plus 1) — important si 3 vs 4
  const base = Math.floor(N / K);
  const rem = N % K;
  const targetSizes = Array.from({ length: K }, (_, i) => base + (i < rem ? 1 : 0));

  // Pré-calc
  const metaAll = players.map(p => ({ p, pv: playerVectorStrength(p, weights, moodWeight) }));
  const females = metaAll.filter(x => x.p.gender === "F");
  const males = metaAll.filter(x => x.p.gender !== "F");

  // Cibles femmes
  const targetWomen: number[] = Array<number>(K).fill(0);
  if (femaleFirst && females.length > 0) {
    const baseF = Math.floor(females.length / K);
    const remF = females.length % K;
    for (let i = 0; i < K; i++) targetWomen[i] = baseF + (i < remF ? 1 : 0);
  }

  const teams: Team[] = Array.from({ length: K }, () => emptyTeam(6));

  // 1) Seed FEMMES par smash en serpentin, en tentant de respecter targetWomen ET targetSizes
  if (femaleFirst && females.length > 0) {
    // on limite implicitement via targetSizes; la contrainte targetWomen est gérée en faisant un 1er passage
    // qui place au maximum targetWomen[i] femmes dans chaque équipe
    const buckets: Array<{ p: Player; pv: PlayerVec }[]> = Array.from({ length: K }, () => []);
    // pré-répartition "théorique" pour respecter targetWomen en serpentin
    let forward = true, i = 0;
    const femSorted = [...females].sort((a, b) => b.pv.smashRaw - a.pv.smashRaw);
    for (const f of femSorted) {
      let placed = false, guard = 0;
      while (!placed && guard < K * 2) {
        const idx = Math.max(0, Math.min(i, K - 1));
        // n'ajoute au "bucket" que si on n'a pas dépassé targetWomen pour cette équipe
        if (buckets[idx].length < targetWomen[idx]) {
          buckets[idx].push(f);
          placed = true;
        }
        if (forward) {
          i++;
          if (i >= K) { i = K - 1; forward = false; }
        } else {
          i--;
          if (i < 0) { i = 0; forward = true; }
        }
        guard++;
      }
      if (!placed) {
        // si toutes les cibles femmes sont déjà satisfaites, on pousse juste en charge la plus faible
        let bestI = 0, bestLen = Infinity;
        for (let t = 0; t < K; t++) {
          if (buckets[t].length < bestLen) { bestLen = buckets[t].length; bestI = t; }
        }
        buckets[bestI].push(f);
      }
    }
    // maintenant, place vraiment en respectant targetSizes
    for (let t = 0; t < K; t++) {
      for (const f of buckets[t]) {
        if (teams[t].members.length < targetSizes[t]) addToTeam(teams[t], f.p, f.pv);
      }
    }
  }

  // 2) Seed HOMMES par smash en serpentin (remplit le reste) en respectant targetSizes
  const malesLeft = metaAll.filter(x => !teams.some(T => T.members.some(m => m.id === x.p.id)));
  seedBySmashSerpentine(teams, malesLeft, targetSizes);

  // 3) Swaps intra-genre pilotés par coût normalisé (attaque prioritaire)
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

    // swap
    removeFromTeam(ta, ia, pva);
    removeFromTeam(tb, ib, pvb);
    addToTeam(ta, pb, pvb);
    addToTeam(tb, pa, pva);

    const newCost = computeCost(teams, lambdaCat, weights, lambdaMood, attackPriorityFactor);
    if (newCost <= bestCost) {
      bestCost = newCost;
    } else {
      // revert
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
export interface FrontBuildOptions {
  numTeams?: number;
  weights?: FrontWeights;
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
  attackPriorityFactor?: number;
}

export function buildTeamsFromPlayers(players: Player[], opts: FrontBuildOptions = {}) {
  const normalized = {
    weights: opts.weights ?? DEFAULT_WEIGHTS,
    lambdaCat: opts.lambdaCat ?? 0.5,
    lambdaMood: opts.lambdaMood ?? 0.3,
    moodWeight: opts.moodWeight ?? 0.15,
    swapIterations: opts.swapIterations ?? 5000,
    femaleFirst: opts.femaleFirst ?? true,
    attackPriorityFactor: opts.attackPriorityFactor ?? 2,
    ...(opts.numTeams ? { numTeams: opts.numTeams } : { numTeams: 2 }),
  } as const;
  return buildBalancedMixedTeams(players, normalized);
}

export function buildTeamsFromJsonString(jsonString: string, opts: FrontBuildOptions = {}) {
  const players = JSON.parse(jsonString) as Player[];
  return buildTeamsFromPlayers(players, opts);
}