"use client";

import { useState } from "react";
import type { PlayerFromDb, PlayerConstraint } from "../../lib/types";

interface ConstraintsManagerProps {
  players: PlayerFromDb[];
  constraints: PlayerConstraint[];
  onConstraintsChange: (constraints: PlayerConstraint[]) => void;
  numTeams: number;
}

export function ConstraintsManager({
  players,
  constraints,
  onConstraintsChange,
  numTeams,
}: ConstraintsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [targetTeam, setTargetTeam] = useState<number | undefined>(undefined);
  const [preferredTeamSize, setPreferredTeamSize] = useState<number | undefined>(undefined);

  const checkedPlayers = players.filter((p) => p.checked);

  const startNewConstraint = () => {
    setEditingIndex(null);
    setSelectedPlayerIds([]);
    setLabel("");
    setTargetTeam(undefined);
    setPreferredTeamSize(undefined);
    setIsOpen(true);
  };

  const editConstraint = (index: number) => {
    const constraint = constraints[index];
    setEditingIndex(index);
    setSelectedPlayerIds(constraint.playerIds);
    setLabel(constraint.label || "");
    setTargetTeam(constraint.targetTeam);
    setPreferredTeamSize(constraint.preferredTeamSize);
    setIsOpen(true);
  };

  const saveConstraint = () => {
    if (selectedPlayerIds.length < 2) {
      alert("Vous devez sélectionner au moins 2 joueurs");
      return;
    }

    const newConstraint: PlayerConstraint = {
      playerIds: selectedPlayerIds,
      label: label.trim() || undefined,
      targetTeam: targetTeam,
      preferredTeamSize: preferredTeamSize,
    };

    const newConstraints = [...constraints];
    if (editingIndex !== null) {
      newConstraints[editingIndex] = newConstraint;
    } else {
      newConstraints.push(newConstraint);
    }

    onConstraintsChange(newConstraints);
    setIsOpen(false);
    setSelectedPlayerIds([]);
    setLabel("");
    setTargetTeam(undefined);
    setPreferredTeamSize(undefined);
    setEditingIndex(null);
  };

  const deleteConstraint = (index: number) => {
    if (confirm("Supprimer cette contrainte ?")) {
      const newConstraints = constraints.filter((_, i) => i !== index);
      onConstraintsChange(newConstraints);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || playerId;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-neutral-200">
          Joueurs devant jouer ensemble
        </h3>
        <button
          onClick={startNewConstraint}
          className="rounded-md bg-indigo-600 dark:bg-indigo-600/90 text-white px-3 py-1 text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 cursor-pointer"
          disabled={checkedPlayers.length < 2}
          title={
            checkedPlayers.length < 2
              ? "Cochez au moins 2 joueurs"
              : "Ajouter un groupe"
          }
        >
          + Ajouter un groupe
        </button>
      </div>

      {/* Liste des contraintes existantes */}
      {constraints.length > 0 && (
        <div className="space-y-2">
          {constraints.map((constraint, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {constraint.label && (
                    <div className="font-medium text-sm text-gray-900 dark:text-neutral-100">
                      {constraint.label}
                    </div>
                  )}
                  {constraint.targetTeam && (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-300">
                      Équipe {constraint.targetTeam}
                    </span>
                  )}
                  {constraint.preferredTeamSize && (
                    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                      {constraint.preferredTeamSize} joueurs
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">
                  {constraint.playerIds.map(getPlayerName).join(", ")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editConstraint(index)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm cursor-pointer"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteConstraint(index)}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-sm cursor-pointer"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'édition */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                {editingIndex !== null
                  ? "Modifier le groupe"
                  : "Nouveau groupe"}
              </h3>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Nom du groupe (optionnel)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Duo A, Trio B..."
                  className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Équipe cible
                  </label>
                  <select
                    value={targetTeam ?? ""}
                    onChange={(e) => setTargetTeam(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">Auto</option>
                    {Array.from({ length: numTeams }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Équipe {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Taille d&apos;équipe
                  </label>
                  <select
                    value={preferredTeamSize ?? ""}
                    onChange={(e) => setPreferredTeamSize(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">Auto</option>
                    <option value="4">4 joueurs</option>
                    <option value="5">5 joueurs</option>
                    <option value="6">6 joueurs</option>
                  </select>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                Choisissez une équipe spécifique et/ou une taille d&apos;équipe préférée
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Sélectionner les joueurs ({selectedPlayerIds.length}{" "}
                  sélectionné{selectedPlayerIds.length > 1 ? "s" : ""})
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-md p-2">
                  {checkedPlayers.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => togglePlayer(player.id)}
                        className="rounded border-gray-300 dark:border-neutral-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-900 dark:text-neutral-100">
                        {player.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        ({player.gender})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedPlayerIds([]);
                  setLabel("");
                  setTargetTeam(undefined);
                  setPreferredTeamSize(undefined);
                  setEditingIndex(null);
                }}
                className="rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={saveConstraint}
                className="rounded-md bg-indigo-600 dark:bg-indigo-600/90 text-white px-4 py-2 text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 cursor-pointer disabled:opacity-50"
                disabled={selectedPlayerIds.length < 2}
              >
                {editingIndex !== null ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}