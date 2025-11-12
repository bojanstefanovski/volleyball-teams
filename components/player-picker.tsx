"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { buildBalancedMixedTeams } from "../scripts/voley_teams";

/** Domain types used by the algo */
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

/** DB row shape for players (from Convex) */
type PlayerFromDb = PlayerAlgo & {
  _id: Id<"players">;
  checked: boolean;
};

/** Stepper - / + */
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
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:opacity-90 disabled:opacity-50 cursor-pointer"
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
          className="h-8 w-8 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:opacity-90 disabled:opacity-50 cursor-pointer"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Small helper for 1..10 numeric inputs */
function NoteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;           // 1..10
  onChange: (v: number) => void;
}) {
  // keep a local string buffer so the user can clear, paste, etc.
  const [buf, setBuf] = useState<string>(String(value));

  // if parent value changes from outside, sync buffer
  useEffect(() => {
    setBuf(String(value));
  }, [value]);

  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

  const commit = () => {
    const n = Number(buf);
    if (Number.isFinite(n)) {
      onChange(clamp(n));
    } else {
      // if user left it empty or invalid, fall back to previous value
      setBuf(String(value));
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === "Tab") commit();
    if (e.key === "Escape") setBuf(String(value));
  };

  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-300">{label}</span>
      <input
        // Use text + inputMode so iOS shows numeric keypad but allows empty string
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={buf}
        onChange={(e) => {
          // keep only digits; allow empty while typing
          const digitsOnly = e.target.value.replace(/[^\d]/g, "");
          setBuf(digitsOnly);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-20 text-center rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={`${label} (1 à 10)`}
      />
    </label>
  );
}

/** Slide-over edit panel */
function EditPanel({
  open,
  onClose,
  player,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  player: PlayerFromDb | null;
  onSave: (p: PlayerFromDb) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<PlayerFromDb | null>(player);

  // keep form in sync when player changes
  useEffect(() => setForm(player), [player]);

  if (!open || !form) return null;

  const setCat = (k: keyof Categories, v: number) =>
    setForm({ ...form, categories: { ...form.categories, [k]: v } });

  const setField = <K extends keyof PlayerFromDb>(k: K, v: PlayerFromDb[K]) =>
    setForm({ ...form, [k]: v });

  const submit = async () => {
    await onSave(form);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 bg-neutral-900 border-l border-neutral-800 shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Modifier le joueur</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-neutral-300">Nom</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="block text-sm">
            <span className="text-neutral-300">Sexe</span>
            <select
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value as Gender)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </label>

          <div className="mt-4 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-neutral-200 font-medium">Catégories (1..10)</div>
            <NoteInput label="Service"   value={form.categories.service}   onChange={(v) => setCat("service", v)} />
            <NoteInput label="Réception" value={form.categories.reception} onChange={(v) => setCat("reception", v)} />
            <NoteInput label="Passe"     value={form.categories.passing}   onChange={(v) => setCat("passing", v)} />
            <NoteInput label="Attaque"   value={form.categories.smash}     onChange={(v) => setCat("smash", v)} />
            <NoteInput label="Défense"   value={form.categories.defence}   onChange={(v) => setCat("defence", v)} />
            <NoteInput label="Bloc"      value={form.categories.bloc}      onChange={(v) => setCat("bloc", v)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.checked}
              onChange={(e) => setField("checked", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-800"
            />
            Présent (checked)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md border border-neutral-700 px-3 py-2 text-neutral-300 hover:bg-neutral-800 cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-md border border-neutral-700 bg-indigo-600/90 text-white px-4 py-2 hover:bg-indigo-600 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PlayerPicker() {
  const resultRef = useRef<HTMLDivElement | null>(null);

  // 🔎 Fetch players
  const playersFromDb = useQuery(api.players.list, { onlyChecked: false });
  const toggleCheckedMut = useMutation(api.players.toggleChecked);
  const upsertOneMut = useMutation(api.players.upsertOne);
  const uncheckAllMut = useMutation(api.players.uncheckAll);

  const [filter, setFilter] = useState("");
  const [numTeams, setNumTeams] = useState<number>(4);
  const [teams, setTeams] = useState<ReturnType<typeof buildBalancedMixedTeams> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // edit panel state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerFromDb | null>(null);
  const [saving, setSaving] = useState(false);

  // bulk busy
  const [bulkBusy, setBulkBusy] = useState(false);

  // --- Tri ---
  type SortKey = "name" | "service" | "reception" | "passing" | "smash" | "defence" | "bloc";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // helper flèche tri
  const Arrow = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null : <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;

  const loading = playersFromDb === undefined;
  const players: PlayerFromDb[] = playersFromDb ?? [];

  // filtre + tri
  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const base = !f ? players : players.filter((p) => p.name.toLowerCase().includes(f));

    const factor = sortDir === "asc" ? 1 : -1;

    const getVal = (p: PlayerFromDb): string | number => {
      if (sortKey === "name") return p.name;
      return p.categories[sortKey];
    };

    return [...base].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "string" && typeof vb === "string") {
        const cmp = va.localeCompare(vb, "fr", { sensitivity: "base" });
        if (cmp !== 0) return factor * cmp;
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      } else {
        const na = Number(va);
        const nb = Number(vb);
        if (nb !== na) return factor * (na - nb);
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      }
    });
  }, [players, filter, sortKey, sortDir]);

  const chosen = useMemo(() => players.filter((p) => p.checked), [players]);

  const togglePlayer = async (player: PlayerFromDb) => {
    try {
      await toggleCheckedMut({ _id: player._id, checked: !player.checked });
    } catch (e) {
      console.error("toggleChecked failed:", e);
    }
  };

  const openEditor = (player: PlayerFromDb) => {
    setEditing(player);
    setEditOpen(true);
  };

  const savePlayer = async (p: PlayerFromDb) => {
    setSaving(true);
    try {
      await upsertOneMut({
        id: p.id,
        name: p.name,
        gender: p.gender,
        mood: p.mood ?? 5,
        categories: {
          service: p.categories.service,
          reception: p.categories.reception,
          passing: p.categories.passing,
          smash: p.categories.smash,
          defence: p.categories.defence,
          bloc: p.categories.bloc,
        },
        checked: p.checked,
      });
      setEditOpen(false);
    } catch (e) {
      console.error("upsertOne failed:", e);
      alert("Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const generate = () => {
    try {
      setError(null);
      const result = buildBalancedMixedTeams(chosen, { numTeams, femaleFirst: true, moodWeight: 0, lambdaMood: 0 });
      setTeams(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTeams(null);
    }
  };

  // === Tout décocher ===
  const uncheckAll = async () => {
    if (chosen.length === 0) return;
    const ok = confirm(`Décocher ${chosen.length} joueur(s) ?`);
    if (!ok) return;
    setBulkBusy(true);
    try {
      await uncheckAllMut();
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-neutral-900 text-neutral-100">
      {/* Header */}
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
        {/* Filtre */}
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

          {/* --- Contrôles de tri --- */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-300">Trier par</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="w-40 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="name">Nom</option>
                <option value="service">Service</option>
                <option value="reception">Réception</option>
                <option value="passing">Passe</option>
                <option value="smash">Attaque</option>
                <option value="defence">Défense</option>
                <option value="bloc">Bloc</option>
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-300">Ordre</span>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="w-40 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 hover:bg-neutral-700 cursor-pointer"
                title="Inverser l’ordre"
              >
                {sortDir === "asc" ? "Croissant ↑" : "Décroissant ↓"}
              </button>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-end gap-2">
          <button
            onClick={generate}
            className="rounded-xl border border-neutral-700 bg-indigo-600/90 text-white px-3 py-2 text-sm hover:bg-indigo-600 disabled:opacity-50 cursor-pointer"
            disabled={loading || players.length === 0 || chosen.length === 0}
          >
            Générer les équipes
          </button>

          <button
            onClick={uncheckAll}
            className="rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-50 cursor-pointer"
            disabled={loading || chosen.length === 0 || bulkBusy}
            title={chosen.length === 0 ? "Aucun joueur coché" : "Décocher tous les joueurs cochés"}
          >
            {bulkBusy ? "Décochage…" : `Tout décocher (${chosen.length})`}
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
                  className={`px-4 py-3 transition-colors ${
                    isOn ? "bg-indigo-900/30" : "bg-neutral-900"
                  } hover:bg-neutral-800`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => togglePlayer(p)}
                      className="text-left flex-1 cursor-pointer"
                    >
                      <span className="text-sm font-medium">{p.name}</span>
                    </button>
                    <button
                      onClick={() => openEditor(p)}
                      className="ml-3 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 cursor-pointer"
                    >
                      Éditer
                    </button>
                  </div>
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

                <th
                  className="text-left px-2 py-2 cursor-pointer select-none"
                  onClick={() => {
                    setSortKey("name");
                    setSortDir(sortKey === "name" && sortDir === "desc" ? "asc" : "desc");
                  }}
                  title="Trier par nom"
                >
                  Nom <Arrow k="name" />
                </th>

                <th className="text-left px-2 py-2">Sexe</th>

                {(["service","reception","passing","smash","defence","bloc"] as const).map((k) => (
                  <th
                    key={k}
                    className="text-right px-2 py-2 cursor-pointer select-none"
                    onClick={() => {
                      setSortKey(k);
                      setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc");
                    }}
                    title={`Trier par ${k}`}
                  >
                    {k === "service" && "Service"}
                    {k === "reception" && "Réception"}
                    {k === "passing" && "Passe"}
                    {k === "smash" && "Attaque"}
                    {k === "defence" && "Défense"}
                    {k === "bloc" && "Bloc"}
                    <Arrow k={k as any} />
                  </th>
                ))}

                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p._id}
                  className={`border-t border-neutral-800 hover:bg-neutral-800/60`}
                >
                  <td className="px-2 py-2">
                    <button
                      onClick={() => togglePlayer(p)}
                      className={`h-5 w-5 rounded border cursor-pointer ${
                        p.checked
                          ? "bg-indigo-600 border-indigo-500"
                          : "bg-neutral-800 border-neutral-700"
                      }`}
                      aria-pressed={p.checked}
                      title="Présent"
                    />
                  </td>
                  <td className={`px-2 py-2 ${p.checked ? "text-white" : ""}`}>{p.name}</td>
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
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => openEditor(p)}
                      className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 cursor-pointer"
                    >
                      Éditer
                    </button>
                  </td>
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

      {/* Edit slide-over */}
      <EditPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        player={editing}
        onSave={savePlayer}
        saving={saving}
      />
    </div>
  );
}