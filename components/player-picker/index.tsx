/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { buildBalancedMixedTeams } from "../../scripts/voley_teams";
import { SessionDetail } from "../sessions/session-detail";
import type { PlayerFromDb, BalanceMode, SortKey, SortDir, PlayerConstraint } from "../../lib/types";
import { StepperInput } from "../shared/stepper-input";
import { EditPanel } from "./edit-panel";
import { PlayerTableDesktop } from "./player-table-desktop";
import { PlayerListMobile } from "./player-list-mobile";
import { TeamsResult } from "./teams-result";
import { ConstraintsManager } from "./constraints-manager";

export default function PlayerPicker() {
  const resultRef = useRef<HTMLDivElement | null>(null);

  // 🔎 Fetch players
  const playersFromDb = useQuery(api.players.list, { onlyChecked: false });
  const toggleCheckedMut = useMutation(api.players.toggleChecked);
  const upsertOneMut = useMutation(api.players.upsertOne);
  const uncheckAllMut = useMutation(api.players.uncheckAll);

  // 🔎 Séances / matchs
  const createSessionMut = useMutation(api.sessions.createSessionWithTeams);

  const [filter, setFilter] = useState("");
  const [numTeams, setNumTeams] = useState<number>(4);
  const [teams, setTeams] =
    useState<ReturnType<typeof buildBalancedMixedTeams> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerFromDb | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkBusy, setBulkBusy] = useState(false);

  // session courante affichée sous le générateur
  const [currentSessionId, setCurrentSessionId] =
    useState<Id<"sessions"> | null>(null);

  // tri tableau
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Mode d'équilibrage (si ton algo le gère côté options)
  const [balanceMode, setBalanceMode] =
    useState<BalanceMode>("perCategory");
  const [hybridAlpha, setHybridAlpha] = useState<number>(0.3);

  const [showAverages, setShowAverages] = useState<boolean>(false);
  
  // Contraintes pour forcer des joueurs à jouer ensemble
  const [constraints, setConstraints] = useState<PlayerConstraint[]>([]);

  const loading = playersFromDb === undefined;
  
  // Memoize players array to prevent unnecessary re-renders
  const players = useMemo(
    () => playersFromDb ?? [],
    [playersFromDb]
  );

  // filtre + tri
  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const base = !f
      ? players
      : players.filter((p) => p.name.toLowerCase().includes(f));
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

  const chosen = useMemo(
    () => players.filter((p) => p.checked),
    [players]
  );

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
      alert("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const generate = () => {
    try {
      setError(null);
      const result = buildBalancedMixedTeams(chosen as any, {
        numTeams,
        femaleFirst: true,
        moodWeight: 0,
        lambdaMood: 0,
        balanceMode,
        hybridAlpha,
        constraints,
      } as any);
      setTeams(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTeams(null);
    }
  };

  const saveSession = async () => {
    if (!teams) return;
    const label =
      prompt(
        "Nom de la séance ?",
        "Séance du " + new Date().toLocaleDateString("fr-FR")
      ) ?? "Séance";

    const payload = teams.map((t, idx) => ({
      name: `Équipe ${idx + 1}`,
      playerIds: t.members.map((m: any) => m._id as Id<"players">),
    }));

   const res = await createSessionMut({
  name: label,
  teams: payload,
});

    const sessionId = res.sessionId as Id<"sessions">;

    alert("Séance sauvegardée (matchs créés).");
    setCurrentSessionId(sessionId);
  };

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
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100">
      {/* Header */}
      <header className="flex items-center justify-between sticky top-0 z-20 bg-white dark:bg-neutral-900 p-2 md:static md:p-0">
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-neutral-400">
          <div>
            Présents:{" "}
            <b className="text-gray-900 dark:text-neutral-100">{chosen.length}</b> /{" "}
            {players.length}
          </div>
          <div>
            Équipes: <b className="text-gray-900 dark:text-neutral-100">{numTeams}</b>
          </div>
        </div>
      </header>

      {/* Panneau contrôles */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4 shadow-sm grid md:grid-cols-3 gap-6 md:items-start">
        {/* Filtre + Contraintes */}
        <div className="space-y-3 md:self-start">
          <h2 className="hidden md:block font-semibold text-gray-900 dark:text-white">Filtrer & cocher</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          
          {/* Gestion des contraintes */}
          <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-950/60 p-3 max-h-96 overflow-y-auto">
            <ConstraintsManager
              players={players}
              constraints={constraints}
              onConstraintsChange={setConstraints}
              numTeams={numTeams}
            />
          </div>
        </div>

        {/* Paramètres (tri + nb équipes) */}
        <div className="space-y-3 md:self-start">
          <h2 className="hidden md:block font-semibold text-gray-900 dark:text-white">Paramètres</h2>
          <StepperInput
            label="Nombre d'équipes"
            value={numTeams}
            onChange={setNumTeams}
            min={1}
            max={99}
          />

          <div className="space-y-2 pt-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600 dark:text-neutral-300">Trier par</span>
              <select
                value={sortKey}
                onChange={(e) =>
                  setSortKey(e.target.value as typeof sortKey)
                }
                className="w-40 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
              <span className="text-gray-600 dark:text-neutral-300">Ordre</span>
              <button
                type="button"
                onClick={() =>
                  setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="w-40 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
                title="Inverser l'ordre"
              >
                {sortDir === "asc" ? "Croissant ↑" : "Décroissant ↓"}
              </button>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 md:self-start">
          {/* Équilibrage des équipes */}
          <div className="space-y-2 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-950/60 p-3 text-sm">
            <h3 className="font-medium text-gray-900 dark:text-neutral-200">
              Équilibrage des équipes
            </h3>
            <label className="flex items-center justify-between gap-3">
              <span className="text-gray-600 dark:text-neutral-300">Mode</span>
              <select
                value={balanceMode}
                onChange={(e) =>
                  setBalanceMode(e.target.value as BalanceMode)
                }
                className="w-40 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                title="overall = global; perCategory = par catégorie; hybrid = mix des deux"
              >
                <option value="perCategory">Par catégorie</option>
                <option value="overall">Global</option>
                <option value="hybrid">Hybride</option>
              </select>
            </label>

            {balanceMode === "hybrid" && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-gray-600 dark:text-neutral-300">
                  hybridAlpha (0..1)
                </span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={hybridAlpha}
                  onChange={(e) =>
                    setHybridAlpha(
                      Math.max(
                        0,
                        Math.min(1, Number(e.target.value) || 0)
                      )
                    )
                  }
                  className="w-24 text-center rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="0 = 100% catégorie / 1 = 100% global"
                />
              </label>
            )}
          </div>

          <button
            onClick={generate}
            className="rounded-xl border border-indigo-600 dark:border-neutral-700 bg-indigo-600 dark:bg-indigo-600/90 text-white px-3 py-2 text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 cursor-pointer"
            disabled={loading || players.length === 0 || chosen.length === 0}
          >
            Générer les équipes
          </button>

          {teams && (
            <button
              onClick={saveSession}
              className="rounded-xl border border-green-600 dark:border-green-700 bg-green-600 dark:bg-green-600/90 text-white px-3 py-2 text-sm hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 cursor-pointer"
            >
              💾 Sauvegarder la séance (+ matchs)
            </button>
          )}

          <button
            onClick={uncheckAll}
            className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 px-3 py-2 text-sm hover:bg-gray-300 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer"
            disabled={loading || chosen.length === 0 || bulkBusy}
            title={
              chosen.length === 0
                ? "Aucun joueur coché"
                : "Décocher tous les joueurs cochés"
            }
          >
            {bulkBusy
              ? "Décochage…"
              : `Tout décocher (${chosen.length})`}
          </button>

          {error && (
            <div className="text-rose-600 dark:text-rose-400 text-sm">{error}</div>
          )}
        </div>
      </section>

      {/* Mobile view */}
      <PlayerListMobile
        loading={loading}
        players={visible}
        onToggle={togglePlayer}
        onEdit={openEditor}
      />

      {/* Desktop view */}
      <PlayerTableDesktop
        loading={loading}
        players={visible}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          setSortKey(key);
          setSortDir(
            sortKey === key && sortDir === "desc" ? "asc" : "desc"
          );
        }}
        onToggle={togglePlayer}
        onEdit={openEditor}
      />

      {/* Résultats équipes */}
      {teams && (
        <TeamsResult
          teams={teams}
          showAverages={showAverages}
          onToggleAverages={() => setShowAverages((v) => !v)}
          resultRef={resultRef}
        />
      )}

      {/* Vue de la séance créée (équipes + matchs) */}
      {currentSessionId && (
        <SessionDetail sessionId={currentSessionId} />
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