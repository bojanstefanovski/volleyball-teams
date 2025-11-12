"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  buildRankingList,
  DEFAULT_WEIGHTS,
  type WeightsTuple,
} from "../scripts/voley_teams";

/** Types locaux min. (adapte si tu veux typer Id<"players">) */
type Gender = "M" | "F";
type Categories = {
  service: number; reception: number; passing: number;
  smash: number; defence: number; bloc: number;
};
type PlayerRow = {
  _id: string; id: string; name: string; gender: Gender;
  mood?: number; categories: Categories; checked?: boolean;
};

/* UI helpers */
function Stepper({
  label, value, onChange, min = 1, max = 99,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const onManual = (n: number) => {
    if (Number.isNaN(n)) return;
    onChange(Math.max(min, Math.min(max, Math.floor(n))));
  };
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-neutral-200">
      <span className="text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={dec}
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 cursor-pointer">−</button>
        <input type="number" inputMode="numeric" className="w-20 text-center rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={value} min={min} max={max} onChange={(e) => onManual(Number(e.target.value))} />
        <button type="button" onClick={inc}
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 cursor-pointer">+</button>
      </div>
    </div>
  );
}

function WeightField({
  label, value, onChange, min = 0, max = 10, step = 0.5,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-300">{label}</span>
      <input type="number" inputMode="decimal" step={step} min={min} max={max} value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-24 text-center rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}

/** === Composant: AllPlayersRankingList ===
 *  - Toujours tous les joueurs (listAll)
 *  - Filles + garçons, sans filtre
 */
export default function AllPlayersRankingList() {
  // 1) Récupère TOUS les joueurs (sans filtre)
  const playersFromDb = useQuery(api.players.listAll, {});
  const loading = playersFromDb === undefined;
  const rows: PlayerRow[] = playersFromDb ?? [];

  // 2) Contrôles (Top N, weights, humeur)
  const [topN, setTopN] = useState<number>(20);
  const [moodWeight, setMoodWeight] = useState<number>(0.15);
  const [weights, setWeights] = useState<WeightsTuple>([...DEFAULT_WEIGHTS]);

  const setW = (i: number, v: number) => {
    const copy = [...weights] as WeightsTuple;
    copy[i] = v;
    setWeights(copy);
  };

  // 3) Classement (tous les joueurs, sans filtre)
  const ranking = useMemo(() => {
    // buildRankingList attend Player[] (id, name, gender, mood, categories)
    const base = rows.map((r) => ({
      id: r.id,
      name: r.name,
      gender: r.gender,
      mood: r.mood,
      categories: r.categories,
    }));
    return buildRankingList(base, weights, moodWeight).slice(0, Math.max(1, topN));
  }, [rows, weights, moodWeight, topN]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-neutral-900 text-neutral-100">
      {/* Header */}
      <header className="flex items-center justify-between sticky top-0 z-20 bg-neutral-900 p-2 md:static md:p-0">
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div>Total joueurs (tous) : <b className="text-neutral-100">{rows.length}</b></div>
          <div>Affichés : <b className="text-neutral-100">{ranking.length}</b></div>
        </div>
        <div className="text-xs text-neutral-400">Classement pondéré (poids + humeur)</div>
      </header>

      {/* Contrôles */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm grid md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Affichage</h2>
          <Stepper label="Top N" value={topN} onChange={setTopN} min={1} max={200} />
        </div>

        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Humeur</h2>
          <WeightField
            label="moodWeight (0..1)"
            value={moodWeight}
            onChange={(v) => setMoodWeight(Math.max(0, Math.min(1, v)))}
            min={0}
            max={1}
            step={0.05}
          />
          <button
            onClick={() => setMoodWeight(0)}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 cursor-pointer"
          >
            Ignorer l’humeur
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Poids catégories</h2>
          <div className="grid grid-cols-2 gap-2">
            <WeightField label="Service"   value={weights[0]} onChange={(v) => setW(0, v)} />
            <WeightField label="Réception" value={weights[1]} onChange={(v) => setW(1, v)} />
            <WeightField label="Passe"     value={weights[2]} onChange={(v) => setW(2, v)} />
            <WeightField label="Attaque"   value={weights[3]} onChange={(v) => setW(3, v)} />
            <WeightField label="Défense"   value={weights[4]} onChange={(v) => setW(4, v)} />
            <WeightField label="Bloc"      value={weights[5]} onChange={(v) => setW(5, v)} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setWeights([...DEFAULT_WEIGHTS] as WeightsTuple)}
              className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 cursor-pointer"
            >
              Poids par défaut
            </button>
            <button
              onClick={() => setWeights([3,3,3,3,3,3])}
              className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 cursor-pointer"
            >
              Équilibré (3 partout)
            </button>
          </div>
        </div>
      </section>

      {/* Tableau classement */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-2 text-neutral-400 text-sm">Chargement…</div>
        ) : ranking.length === 0 ? (
          <div className="p-2 text-neutral-400 text-sm">Aucun joueur à afficher.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-neutral-400">
                <th className="px-2 py-2 text-right">#</th>
                <th className="text-left px-2 py-2">Nom</th>
                <th className="text-left px-2 py-2">Sexe</th>
                <th className="text-right px-2 py-2">Service</th>
                <th className="text-right px-2 py-2">Réception</th>
                <th className="text-right px-2 py-2">Passe</th>
                <th className="text-right px-2 py-2">Attaque</th>
                <th className="text-right px-2 py-2">Défense</th>
                <th className="text-right px-2 py-2">Bloc</th>
                <th className="text-right px-2 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p) => (
                <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-800/60">
                  <td className="px-2 py-2 text-right">{p.rank}</td>
                  <td className="px-2 py-2">{p.name}</td>
                  <td className="px-2 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      p.gender === "F" ? "bg-pink-900/30 text-pink-200" : "bg-indigo-900/30 text-indigo-200"
                    }`}>{p.gender}</span>
                  </td>
                  <td className="px-2 py-2 text-right">{p.categories.service}</td>
                  <td className="px-2 py-2 text-right">{p.categories.reception}</td>
                  <td className="px-2 py-2 text-right">{p.categories.passing}</td>
                  <td className="px-2 py-2 text-right">{p.categories.smash}</td>
                  <td className="px-2 py-2 text-right">{p.categories.defence}</td>
                  <td className="px-2 py-2 text-right">{p.categories.bloc}</td>
                  <td className="px-2 py-2 text-right">
                    {p.score.toFixed(2)}
                    <span className="ml-2 text-xs text-neutral-400">
                      ({p.baseTotal.toFixed(1)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}