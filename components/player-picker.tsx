"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import playersData from "@/data/players.json";
import {
  type Player,
  buildBalancedMixedTeams
} from "../scripts/voley_teams";



/** Stepper avec boutons - / + autour du champ (utilisé pour numTeams & teamSize) */
function StepperInput({
  label, value, onChange, min = 1, max = 99,
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
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 active:opacity-90"
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
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 active:opacity-90"
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
  // Données
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Paramètres (→ démarrent à 1 comme demandé)
  const [numTeams, setNumTeams] = useState<number>(1);


  // Résultat
  const [teams, setTeams] = useState<ReturnType<typeof buildBalancedMixedTeams> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les joueurs
  useEffect(() => {
    const data = playersData as Player[];
    setPlayers(data);
  }, []);

  const visible = useMemo(
    () => players.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [players, filter]
  );
  const chosen = useMemo(() => players.filter((p) => selected[p.id]), [players, selected]);

  const togglePlayer = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const toggleAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    players.forEach((p) => (next[p.id] = val));
    setSelected(next);
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
      }, 100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setTeams(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-neutral-900 text-neutral-100">
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
      <section className="rounded-2xl border border-neutral-800 bg-neutral-850 p-4 shadow-sm grid md:grid-cols-3 gap-6">
        {/* Filtre & Sélection */}
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Filtrer & cocher</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 text-sm">
            <button className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 hover:bg-neutral-750" onClick={() => toggleAll(true)}>
              Tout cocher
            </button>
            <button className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 hover:bg-neutral-750" onClick={() => toggleAll(false)}>
              Tout décocher
            </button>
          </div>
        </div>

        {/* Paramètres tournoi (avec steppers - / +) */}
        <div className="space-y-3">
          <h2 className="hidden md:block font-semibold">Paramètres tournoi</h2>
          <StepperInput
            label="Nombre d’équipes"
            value={numTeams}
            onChange={setNumTeams}
            min={1}
            max={99}
          />
        </div>

        {/* Bouton générer + erreurs */}
        <div className="flex flex-col justify-end gap-2">
          <button onClick={generate} className="rounded-xl border border-neutral-700 bg-indigo-600/90 text-white px-3 py-2 text-sm hover:bg-indigo-600">
            Générer les équipes
          </button>
          {error && <div className="text-rose-400 text-sm">{error}</div>}
        </div>
      </section>

      {/* ======== MOBILE: NOMS UNIQUEMENT (pas de catégories/sex/mood) ======== */}
      <section className="md:hidden rounded-2xl border border-neutral-800 bg-neutral-850 shadow-sm">
        <ul className="divide-y divide-neutral-800">
          {visible.map((p) => {
            const isOn = !!selected[p.id];
            return (
              <li
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                role="button"
                aria-pressed={isOn}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  isOn ? "bg-indigo-900/30" : "bg-neutral-850"
                } hover:bg-neutral-800 active:opacity-90`}
              >
                <span className="text-sm font-medium">{p.name}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ======== DESKTOP: TABLEAU COMPLET (avec catégories + sexe + mood) ======== */}
      <section className="hidden md:block rounded-2xl border border-neutral-800 bg-neutral-850 p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-neutral-400">
              <th className="px-2 py-2">✔</th>
              <th className="text-left px-2 py-2">Nom</th>
              <th className="text-left px-2 py-2">Sexe</th>
              <th className="text-right px-2 py-2">Mood</th>
              <th className="text-right px-2 py-2">Service</th>
              <th className="text-right px-2 py-2">Réception</th>
              <th className="text-right px-2 py-2">Passe</th>
              <th className="text-right px-2 py-2">Attaque</th>
              <th className="text-right px-2 py-2">Défense</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-800/60">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-800"
                    checked={!!selected[p.id]}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
                    }
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
                <td className="px-2 py-2 text-right">{p.mood ?? 5}</td>
                <td className="px-2 py-2 text-right">{p.categories.service}</td>
                <td className="px-2 py-2 text-right">{p.categories.reception}</td>
                <td className="px-2 py-2 text-right">{p.categories.passing}</td>
                <td className="px-2 py-2 text-right">{p.categories.smash}</td>
                <td className="px-2 py-2 text-right">{p.categories.defence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Résultats équipes */}
      {teams && (
        <section ref={resultRef} className="grid md:grid-cols-2 gap-4">
          {teams.map((t, i) => (
            <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-850 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Équipe {i + 1}</h3>
              </div>
              <ul className="text-sm divide-y divide-neutral-800 grid grid-cols-2">
                {t.members.map((m) => (
                  <li key={m.id} className="py-2">{m.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}