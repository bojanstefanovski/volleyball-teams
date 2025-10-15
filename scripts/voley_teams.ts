#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * TypeScript strict — Répartition d'équipes mixtes pour volley (1..10 + mood)
 * - Notes catégorie (service, reception, passing, smash, defence) + mood sur 1..10 (1 = meilleur, 10 = moins bon)
 * - Poids par catégorie (weights)
 * - Mixité: répartition des femmes prioritaire + swaps à genre égal
 * - Front helpers pour utiliser un tableau JSON directement
 * - ➜ VERSION: ne prend QUE numTeams (répartition auto des tailles d'équipes)
 */

// ---------------- Types ----------------
type Gender = "M" | "F";
export type WeightsTuple = [number, number, number, number, number];

interface Categories {
  service: number;    // 1..10
  reception: number;  // 1..10
  passing: number;    // 1..10
  smash: number;      // 1..10
  defence: number;    // 1..10
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  mood?: number;            // 1..10 (facultatif → neutre = 5.5)
  categories: Categories;   // 1..10 (1 = meilleur, 10 = moins bon)
}

interface PlayerVec {
  total: number;    // score total (pondéré + mood)
  vec: number[];    // [service..defence] pondéré par weights
  baseTotal: number;
  moodNorm: number; // [-1..+1]
}

export interface Team {
  members: Player[];
  total: number;       // somme des totals
  baseTotal: number;   // somme sans mood
  catSums: number[];   // somme par catégorie (pondérée)
  women: number;       // compteur F
  moodSum: number;     // somme des moods normalisés
}

export interface BuildOptions {
  numTeams?: number;
  weights?: WeightsTuple;        // ordre: [service, reception, passing, smash, defence]
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
}

// ---------------- Utils ----------------
// volley: Service, Réception, Passe, Attaque (smash), Défense
export const DEFAULT_CATEGORIES = ["service", "reception", "passing", "attack", "defence"];
export const DEFAULT_WEIGHTS: WeightsTuple = [2, 3, 4, 4, 2];

function toStrength(note: number, scale = 10): number {
  if (note < 1 || note > scale) throw new Error(`note doit être 1..${scale}`);
  return note; // 10 = meilleur, 1 = moins bon
}

function moodNorm(mood: number): number {
  if (mood < 1 || mood > 10) throw new Error("mood doit être 1..10");
  return (mood - 5.5) / 4.5; // 1 -> -1, 10 -> +1
}

function playerVectorStrength(
  p: Player,
  weights: WeightsTuple,
  moodWeight: number
): PlayerVec {
  const raw: number[] = [
    toStrength(p.categories.service),
    toStrength(p.categories.reception),
    toStrength(p.categories.passing),
    toStrength(p.categories.smash),
    toStrength(p.categories.defence),
  ];
  const vecWeighted = raw.map((v, i) => v * (weights[i] ?? 1));
  const baseTotal = vecWeighted.reduce((a, b) => a + b, 0);
  const m = p.mood ?? 5.5;
  const total = baseTotal * (1 + moodWeight * moodNorm(m));
  return { total, vec: vecWeighted, baseTotal, moodNorm: moodNorm(m) };
}

function emptyTeam(k = 5): Team {
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

export function computeCost(
  teams: Team[],
  lambdaCat: number,
  weights: WeightsTuple,
  lambdaMood: number
): number {
  const k = teams.length;
  const totals = teams.map(t => t.total);
  const mean = totals.reduce((a, b) => a + b, 0) / k;
  const varTotals = totals.reduce((a, s) => a + (s - mean) ** 2, 0) / k;

  let varCatsNorm = 0;
  if (lambdaCat > 0) {
    let acc = 0;
    let wsum = 0;
    for (let c = 0; c < 5; c++) {
      const xs = teams.map(t => t.catSums[c]);
      const m = xs.reduce((a, b) => a + b, 0) / k;
      const vc = xs.reduce((a, x) => a + (x - m) ** 2, 0) / k;
      const wc = (weights[c] ?? 1) ** 2;
      acc += wc * vc;
      wsum += wc;
    }
    varCatsNorm = acc / (wsum || 1);
  }

  let varMood = 0;
  if (lambdaMood > 0) {
    const ms = teams.map(t => t.moodSum);
    const mm = ms.reduce((a, b) => a + b, 0) / k;
    varMood = ms.reduce((a, x) => a + (x - mm) ** 2, 0) / k;
  }

  return varTotals + lambdaCat * varCatsNorm + lambdaMood * varMood;
}

// ---------------- Core Algorithm ----------------
export function buildBalancedMixedTeams(players: Player[], opts: BuildOptions = {}): Team[] {
  const {
    numTeams,
    weights = DEFAULT_WEIGHTS,
    lambdaCat = 0.3,
    lambdaMood = 0.3,
    moodWeight = 0.15,
    swapIterations = 5000,
    femaleFirst = true,
  } = opts;

  if (!numTeams) throw new Error("Spécifie numTeams (le nombre d'équipes).");

  const N = players.length;
  const K = Math.max(2, numTeams);

  // Répartition automatique des tailles d'équipe (diffèrent d'au plus 1)
  const base = Math.floor(N / K);
  const rem = N % K;
  const targetSizes = Array.from({ length: K }, (_, i) => base + (i < rem ? 1 : 0));

  // Validation des données joueur
  for (const pl of players) {
    (["service", "reception", "passing", "smash", "defence"] as (keyof Categories)[]).forEach((kCat) => {
      const v = pl.categories[kCat];
      if (typeof v !== "number" || v < 1 || v > 10) {
        throw new Error(`Catégorie ${String(kCat)} de ${pl.name} doit être 1..10`);
      }
    });
    if (pl.mood !== undefined && (pl.mood < 1 || pl.mood > 10)) {
      throw new Error(`mood de ${pl.name} doit être 1..10`);
    }
  }

  // Pré-calc
  const meta = players.map(p => ({ p, pv: playerVectorStrength(p, weights, moodWeight) }));
  const females = meta.filter(x => x.p.gender === "F");
  const males = meta.filter(x => x.p.gender !== "F");

  // Cibles femmes
  const targetWomen: number[] = Array<number>(K).fill(0);
  if (femaleFirst && females.length > 0) {
    const baseF = Math.floor(females.length / K);
    const remF = females.length % K;
    for (let i = 0; i < K; i++) targetWomen[i] = baseF + (i < remF ? 1 : 0);
  }

  const teams: Team[] = Array.from({ length: K }, () => emptyTeam(5));

  // Placer femmes (fortes -> faibles) en respectant targetSizes[i]
  if (femaleFirst) {
    females.sort((a, b) => b.pv.total - a.pv.total);
    for (const f of females) {
      const candidates: { i: number; total: number }[] = [];
      for (let i = 0; i < K; i++) {
        const t = teams[i];
        if (t.members.length < targetSizes[i] && t.women < targetWomen[i]) {
          candidates.push({ i, total: t.total });
        }
      }
      if (candidates.length === 0) {
        for (let i = 0; i < K; i++) {
          const t = teams[i];
          if (t.members.length < targetSizes[i]) candidates.push({ i, total: t.total });
        }
      }
      candidates.sort((a, b) => a.total - b.total);
      addToTeam(teams[candidates[0].i], f.p, f.pv);
    }
  }

  // Placer hommes (fortes -> faibles) en snake, en respectant targetSizes[idx]
  males.sort((a, b) => b.pv.total - a.pv.total);
  let dir = +1, idx = 0;
  for (const m of males) {
    let placed = false;
    let safety = 0;
    while (!placed && safety < 3 * K) {
      const i = Math.max(0, Math.min(idx, K - 1));
      const t = teams[i];
      if (t.members.length < targetSizes[i]) {
        addToTeam(t, m.p, m.pv);
        placed = true;
      }
      idx += dir;
      if (idx < 0 || idx >= K) { dir *= -1; idx += dir; }
      safety++;
    }
    // sécurité si toutes les équipes semblent pleines
    if (!placed) {
      let bestI = 0, bestLen = Infinity;
      for (let i = 0; i < K; i++) {
        if (teams[i].members.length < bestLen) { bestLen = teams[i].members.length; bestI = i; }
      }
      addToTeam(teams[bestI], m.p, m.pv);
    }
  }

  // Swaps (même genre) — inchangé
  let bestCost = computeCost(teams, lambdaCat, weights, lambdaMood);
  const pvById = new Map<string, PlayerVec>(meta.map(x => [x.p.id, x.pv]));

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

    const newCost = computeCost(teams, lambdaCat, weights, lambdaMood);
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

// ---------------- CLI parsing (optionnel) ----------------
interface CliOptions {
  numTeams?: number;
  weights?: WeightsTuple;
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
}

export function parseCli(): { file: string | null; opts: CliOptions } {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith("--")) ?? null;
  const opts: CliOptions = {};
  for (const a of args.filter(a => a.startsWith("--"))) {
    const [k, vRaw] = a.replace(/^--/, "").split("=");
    const v = vRaw ?? "true";
    switch (k) {
      case "numTeams": opts.numTeams = Number(v); break;
      case "lambdaCat": opts.lambdaCat = Number(v); break;
      case "lambdaMood": opts.lambdaMood = Number(v); break;
      case "moodWeight": opts.moodWeight = Number(v); break;
      case "swapIterations": opts.swapIterations = Number(v); break;
      case "femaleFirst": opts.femaleFirst = v === "true"; break;
      case "weights": {
        const arr = v.split(",").map(Number);
        if (arr.length !== 5 || arr.some(n => Number.isNaN(n))) {
          throw new Error("--weights doit contenir exactement 5 nombres séparés par des virgules");
        }
        opts.weights = arr as WeightsTuple;
        break;
      }
      default:
        throw new Error(`Option inconnue: --${k}`);
    }
  }
  return { file, opts };
}

// ---------------- Front helpers (no fs, no CLI) ----------------
export type FrontWeights = [number, number, number, number, number];

export interface FrontBuildOptions {
  numTeams?: number;
  weights?: FrontWeights;       // [service, reception, passing, smash, defence]
  lambdaCat?: number;
  lambdaMood?: number;
  moodWeight?: number;
  swapIterations?: number;
  femaleFirst?: boolean;
}

export function buildTeamsFromPlayers(
  players: Player[],
  opts: FrontBuildOptions = {}
) {
  const normalized = {
    weights: opts.weights ?? DEFAULT_WEIGHTS,
    lambdaCat: opts.lambdaCat ?? 0.3,
    lambdaMood: opts.lambdaMood ?? 0.3,
    moodWeight: opts.moodWeight ?? 0.15,
    swapIterations: opts.swapIterations ?? 5000,
    femaleFirst: opts.femaleFirst ?? true,
    // ➜ On ne passe QUE numTeams. Défaut: 2 équipes.
    ...(opts.numTeams ? { numTeams: opts.numTeams } : { numTeams: 2 }),
  } as const;

  return buildBalancedMixedTeams(players, normalized);
}

export function buildTeamsFromJsonString(
  jsonString: string,
  opts: FrontBuildOptions = {}
) {
  const players = JSON.parse(jsonString) as Player[];
  return buildTeamsFromPlayers(players, opts);
}