"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

type PlayerRow = {
  id?: string;
  name: string;
  gender: "M" | "F";
  mood?: number;
  categories: {
    service: number; reception: number; passing: number; smash: number; defence: number; bloc: number;
  };
  checked?: boolean;
};

const clamp = (n: number, min = 1, max = 10) => Math.max(min, Math.min(max, Math.floor(n)));
const kebabId = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function NumberField({
  label, value, onChange, min = 1, max = 10,
}: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-300">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="rounded-lg border border-white/15 bg-neutral-900/70 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}

export default function CreatePlayerCard() {
  const importPlayers = useAction(api.players.importPlayers);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [mood, setMood] = useState(5);
  const [service, setService] = useState(5);
  const [reception, setReception] = useState(5);
  const [passing, setPassing] = useState(5);
  const [smash, setSmash] = useState(5);
  const [defence, setDefence] = useState(5);
  const [bloc, setBloc] = useState(5);
  const [checked, setChecked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!name.trim()) { setErr("Le nom est requis."); return; }

    const payload: PlayerRow = {
      id: kebabId(name),
      name: name.trim(),
      gender,
      mood,
      categories: { service, reception, passing, smash, defence, bloc },
      checked,
    };

    try {
      setBusy(true);
      const res = await importPlayers({ players: [payload] });
      setOk(`✓ ${res.count} joueur créé`);
      setName("");
      setMood(5); setService(5); setReception(5); setPassing(5); setSmash(5); setDefence(5); setBloc(5);
      setChecked(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-neutral-900/60 p-5 shadow-xl space-y-4">
      <h3 className="text-white text-lg font-semibold">Créer un joueur</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="text-neutral-300">Nom</span>
            <input
              type="text"
              placeholder="Prénom Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/15 bg-neutral-900/70 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-300">Genre</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "M" | "F")}
              className="rounded-lg border border-white/15 bg-neutral-900/70 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </label>

          <NumberField label="Service" value={service} onChange={setService} />
          <NumberField label="Réception" value={reception} onChange={setReception} />
          <NumberField label="Passe" value={passing} onChange={setPassing} />
          <NumberField label="Attaque" value={smash} onChange={setSmash} />
          <NumberField label="Défense" value={defence} onChange={setDefence} />
          <NumberField label="Bloc" value={bloc} onChange={setBloc} />

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-neutral-900"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-neutral-300">Cocher comme présent</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-white/15 bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-60"
          >
            Créer
          </button>
          {busy && <div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
        </div>

        {ok && <div className="text-emerald-300 text-sm">{ok}</div>}
        {err && <div className="text-rose-300 text-sm">{err}</div>}
      </form>
    </div>
  );
}