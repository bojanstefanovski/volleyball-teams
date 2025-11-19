"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  buildRankingList,
  DEFAULT_WEIGHTS,
  type WeightsTuple,
} from "../../scripts/voley_teams";
import type { Gender, Categories } from "../../lib/types";
import { StepperInput } from "../shared/stepper-input";
import { WeightField } from "../shared/weight-field";

type PlayerRow = {
  _id: string; id: string; name: string; gender: Gender;
  mood?: number; categories: Categories; checked?: boolean;
};

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
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100">
      {/* Header */}
      <header className="flex items-center justify-between sticky top-0 z-20 bg-white dark:bg-neutral-900 p-2 md:static md:p-0">
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-neutral-400">
          <div>Total joueurs (tous) : <b className="text-gray-900 dark:text-neutral-100">{rows.length}</b></div>
          <div>Affichés : <b className="text-gray-900 dark:text-neutral-100">{ranking.length}</b></div>
        </div>
        <div className="text-xs text-gray-600 dark:text-neutral-400">Classement pondéré (poids + humeur)</div>
      </header>

      {/* Contrôles */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4 shadow-sm grid md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold text-gray-900 dark:text-white">Affichage</h2>
          <StepperInput label="Top N" value={topN} onChange={setTopN} min={1} max={200} />
        </div>

        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold text-gray-900 dark:text-white">Humeur</h2>
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
            className="rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Ignorer l&apos;humeur
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold text-gray-900 dark:text-white">Poids catégories</h2>
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
              className="rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Poids par défaut
            </button>
            <button
              onClick={() => setWeights([3,3,3,3,3,3])}
              className="rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Équilibré (3 partout)
            </button>
          </div>
        </div>
      </section>

      {/* Tableau classement */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-2 text-gray-500 dark:text-neutral-400 text-sm">Chargement…</div>
        ) : ranking.length === 0 ? (
          <div className="p-2 text-gray-500 dark:text-neutral-400 text-sm">Aucun joueur à afficher.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-600 dark:text-neutral-400">
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
                <tr key={p.id} className="border-t border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/60">
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.rank}</td>
                  <td className="px-2 py-2 text-gray-900 dark:text-neutral-100">{p.name}</td>
                  <td className="px-2 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      p.gender === "F" ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-200" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200"
                    }`}>{p.gender}</span>
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.service}</td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.reception}</td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.passing}</td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.smash}</td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.defence}</td>
                  <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">{p.categories.bloc}</td>
                  <td className="px-2 py-2 text-right text-gray-900 dark:text-neutral-100">
                    {p.score.toFixed(2)}
                    <span className="ml-2 text-xs text-gray-500 dark:text-neutral-400">
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