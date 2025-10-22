"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { buildBalancedMixedTeams } from "../scripts/voley_teams";

type Gender = "M" | "F";
type Categories = {
  service: number;
  reception: number;
  passing: number;
  smash: number;
  defence: number;
  bloc: number;
};
type PlayerAlgo = {
  id: string;
  name: string;
  gender: Gender;
  mood?: number;
  categories: Categories;
};

// Stepper - / +
function StepperInput({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const onManual = (v: number) => {
    if (Number.isNaN(v)) return;
    onChange(Math.max(min, Math.min(max, Math.floor(v))));
  };
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-neutral-200">
      <span className="text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label={`Diminuer ${label}`}
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:opacity-90 disabled:opacity-50"
          disabled={value <= min}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          className="w-20 text-center rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onManual(Number(e.target.value))}
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`Augmenter ${label}`}
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:opacity-90 disabled:opacity-50"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PlayerPicker() {
  const resultRef = useRef<HTMLDivElement | null>(null);

  // 🔎 Récupère les joueurs depuis Convex
  const playersFromDb =
    useQuery(api.players.list, { onlyChecked: false }) as
      | Array<
          PlayerAlgo & {
            _id: string; // Convex id
            checked: boolean;
          }
        >
      | undefined;

  const toggleCheckedMut = useMutation(api.players.toggleChecked);

  const [filter, setFilter] = useState("");
  const [numTeams, setNumTeams] = useState<number>(1);
  const [teams, setTeams] =
    useState<ReturnType<typeof buildBalancedMixedTeams> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = playersFromDb === undefined;
  const players = playersFromDb ?? [];

  // Filtrage affichage
  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return players;
    return players.filter((p) => p.name.toLowerCase().includes(f));
  }, [players, filter]);

  // Joueurs cochés
  const chosen = useMemo(() => players.filter((p) => p.checked), [players]);

  // Toggle ligne (row click). On ne met pas onChange sur la checkbox pour éviter les doubles toggles.
  const togglePlayer = async (player: { _id: string; checked: boolean }) => {
    try {
      await toggleCheckedMut({ _id: player._id as any, checked: !player.checked });
    } catch (e) {
      console.error("toggleChecked failed:", e);
    }
  };

  const generate = () => {
    try {
      setError(null);
      const result = buildBalancedMixedTeams(chosen, {
        numTeams,
        femaleFirst: true,
      });
      setTeams(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTeams(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-neutral-900 text-neutral-100">
      {/* Header sticky en mobile */}
      <header className="flex items-center justify-between sticky top-0 z-20 bg-neutral-900 p-2 md:static md:p-0">
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div>
            Présents: <b className="text-neutral-100">{chosen.length}</b> / {players.length}
          </div>
          <div>
            Équipes: <b className="text-neutral-100">{numTeams}</b>
          </div>
        </div>
      </header>

      {/* Panneau contrôles */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm grid md:grid-cols-3 gap-6">
        {/* Filtre (caché mobile si tu veux, ici on laisse visible) */}
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Filtrer & cocher</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Paramètres */}
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Paramètres</h2>
          <StepperInput
            label="Nombre d’équipes"
            value={numTeams}
            onChange={setNumTeams}
            min={1}
            max={99}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-end gap-2">
          <button
            onClick={generate}
            className="rounded-xl border border-neutral-700 bg-indigo-600/90 text-white px-3 py-2 text-sm hover:bg-indigo-600 disabled:opacity-50"
            disabled={loading || players.length === 0 || chosen.length === 0}
          >
            Générer les équipes
          </button>
          {error && <div className="text-rose-400 text-sm">{error}</div>}
        </div>
      </section>

      {/* ======== MOBILE: NOMS UNIQUEMENT ======== */}
      <section className="md:hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-sm">
        {loading ? (
          <div className="p-4 text-neutral-400 text-sm">Chargement…</div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {visible.map((p) => {
              const isOn = !!p.checked;
              return (
                <li
                  key={p._id}
                  onClick={() => togglePlayer(p)}
                  role="button"
                  aria-pressed={isOn}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isOn ? "bg-indigo-900/30" : "bg-neutral-900"
                  } hover:bg-neutral-800 active:opacity-90`}
                >
                  <span className="text-sm font-medium">{p.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ======== DESKTOP: TABLEAU COMPLET ======== */}
      <section className="hidden md:block rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-2 text-neutral-400 text-sm">Chargement…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-neutral-400">
                <th className="px-2 py-2">✔</th>
                <th className="text-left px-2 py-2">Nom</th>
                <th className="text-left px-2 py-2">Sexe</th>
                <th className="text-right px-2 py-2">Service</th>
                <th className="text-right px-2 py-2">Réception</th>
                <th className="text-right px-2 py-2">Passe</th>
                <th className="text-right px-2 py-2">Attaque</th>
                <th className="text-right px-2 py-2">Défense</th>
                <th className="text-right px-2 py-2">Bloc</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => togglePlayer(p)}
                  className={`border-t border-neutral-800 hover:bg-neutral-800/60 cursor-pointer ${
                    p.checked ? "bg-indigo-900/30" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    {/* readOnly + pointer-events-none pour éviter double toggle */}
                    <input
                      type="checkbox"
                      className="h-4 w-4 pointer-events-none"
                      checked={p.checked}
                      readOnly
                    />
                  </td>
                  <td className="px-2 py-2">{p.name}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.gender === "F"
                          ? "bg-pink-900/30 text-pink-200"
                          : "bg-indigo-900/30 text-indigo-200"
                      }`}
                    >
                      {p.gender}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{p.categories.service}</td>
                  <td className="px-2 py-2 text-right">{p.categories.reception}</td>
                  <td className="px-2 py-2 text-right">{p.categories.passing}</td>
                  <td className="px-2 py-2 text-right">{p.categories.smash}</td>
                  <td className="px-2 py-2 text-right">{p.categories.defence}</td>
                  <td className="px-2 py-2 text-right">{p.categories.bloc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Résultats équipes */}
      {teams && (
        <section ref={resultRef} className="grid md:grid-cols-2 gap-4">
          {teams.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Équipe {i + 1}</h3>
              </div>
              <ul className="text-sm divide-y divide-neutral-800 grid grid-cols-2">
                {t.members.map((m) => (
                  <li key={m.id} className="py-2">
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}