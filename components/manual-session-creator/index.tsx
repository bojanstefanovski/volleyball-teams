/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import type { TeamPayload } from "../../lib/types";

export function ManualSessionCreator() {
  const playersFromDb = useQuery(api.players.list, { onlyChecked: false });
  const createSessionMut = useMutation(api.sessions.createSessionWithTeams);

  const [sessionName, setSessionName] = useState("");
  const [numTeams, setNumTeams] = useState(4);
  const [teams, setTeams] = useState<TeamPayload[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const players = useMemo(() => playersFromDb ?? [], [playersFromDb]);

  const filteredPlayers = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return !f
      ? players
      : players.filter((p) => p.name.toLowerCase().includes(f));
  }, [players, filter]);

  // Initialiser les équipes
  const initializeTeams = () => {
    const newTeams: TeamPayload[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({
        name: `Équipe ${i + 1}`,
        playerIds: [],
      });
    }
    setTeams(newTeams);
  };

  // Ajouter un joueur à une équipe
  const addPlayerToTeam = (playerId: Id<"players">, teamIndex: number) => {
    setTeams((prev) => {
      const newTeams = [...prev];
      // Retirer le joueur de toutes les équipes d'abord
      newTeams.forEach((team) => {
        team.playerIds = team.playerIds.filter((id) => id !== playerId);
      });
      // Ajouter à l'équipe sélectionnée
      newTeams[teamIndex].playerIds.push(playerId);
      return newTeams;
    });
  };

  // Retirer un joueur d'une équipe
  const removePlayerFromTeam = (playerId: Id<"players">, teamIndex: number) => {
    setTeams((prev) => {
      const newTeams = [...prev];
      newTeams[teamIndex].playerIds = newTeams[teamIndex].playerIds.filter(
        (id) => id !== playerId
      );
      return newTeams;
    });
  };

  // Changer le nom d'une équipe
  const updateTeamName = (teamIndex: number, name: string) => {
    setTeams((prev) => {
      const newTeams = [...prev];
      newTeams[teamIndex].name = name;
      return newTeams;
    });
  };


  // Obtenir l'index de l'équipe d'un joueur
  const getPlayerTeamIndex = (playerId: Id<"players">) => {
    return teams.findIndex((team) => team.playerIds.includes(playerId));
  };

  // Sauvegarder la session
  const saveSession = async () => {
    if (!sessionName.trim()) {
      alert("Veuillez entrer un nom pour la séance");
      return;
    }

    const hasPlayers = teams.some((team) => team.playerIds.length > 0);
    if (!hasPlayers) {
      alert("Veuillez ajouter au moins un joueur à une équipe");
      return;
    }

    setSaving(true);
    try {
      await createSessionMut({
        name: sessionName,
        teams: teams.filter((team) => team.playerIds.length > 0),
      });
      alert("Séance créée avec succès !");
      // Réinitialiser
      setSessionName("");
      setTeams([]);
    } catch (e) {
      console.error("Erreur lors de la création de la séance:", e);
      alert("Erreur lors de la création de la séance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-2 sm:p-4 space-y-4 sm:space-y-6 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100">
      <header className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Créer une séance manuelle</h1>
        
        <div className="grid gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-neutral-300 mb-2">
              Nom de la séance
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Ex: Séance du 16/11/2024"
              className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm sm:text-base text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-neutral-300 mb-2">
              Nombre d&apos;équipes
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={2}
                max={10}
                value={numTeams}
                onChange={(e) => setNumTeams(Math.max(2, Math.min(10, Number(e.target.value))))}
                className="w-20 sm:w-24 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 sm:px-3 py-2 text-sm sm:text-base text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={initializeTeams}
                className="flex-1 sm:flex-none rounded-md border border-indigo-600 dark:border-neutral-700 bg-indigo-600 dark:bg-indigo-600/90 text-white px-3 sm:px-4 py-2 text-sm sm:text-base hover:bg-indigo-700 dark:hover:bg-indigo-600 cursor-pointer"
              >
                <span className="hidden sm:inline">Initialiser les équipes</span>
                <span className="sm:hidden">Initialiser</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {teams.length > 0 && (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          {/* Liste des joueurs disponibles */}
          <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Joueurs disponibles</h2>
            
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="w-full mb-3 sm:mb-4 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
              {filteredPlayers.map((player) => {
                const teamIndex = getPlayerTeamIndex(player._id);
                const isAssigned = teamIndex !== -1;

                return (
                  <div
                    key={player._id}
                    className={`p-2 sm:p-3 rounded-lg border ${
                      isAssigned
                        ? "border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-neutral-100">{player.name}</div>
                        <div className="text-xs text-gray-600 dark:text-neutral-400">
                          {player.gender === "F" ? "F" : "M"}
                          {isAssigned && (
                            <span className="ml-2 text-indigo-600 dark:text-indigo-400 truncate">
                              → {teams[teamIndex].name}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAssigned ? (
                        <button
                          onClick={() => removePlayerFromTeam(player._id, teamIndex)}
                          className="ml-2 rounded-md border border-red-600 dark:border-red-700 bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-200 px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-red-100 dark:hover:bg-red-600/30 cursor-pointer whitespace-nowrap"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="ml-2 flex gap-1 flex-wrap">
                          {teams.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => addPlayerToTeam(player._id, idx)}
                              className="rounded-md border border-gray-400 dark:border-neutral-700 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 px-2 py-1 text-xs hover:bg-gray-300 dark:hover:bg-neutral-600 cursor-pointer min-w-[28px]"
                              title={`Ajouter à ${teams[idx].name}`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Équipes */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Équipes</h2>
            
            <div className="space-y-2 sm:space-y-3">
              {teams.map((team, teamIndex) => (
                <div
                  key={teamIndex}
                  className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeamName(teamIndex, e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-neutral-400 whitespace-nowrap">
                      {team.playerIds.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    {team.playerIds.length === 0 ? (
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-neutral-500 italic text-center py-3 sm:py-4">
                        Aucun joueur
                      </div>
                    ) : (
                      team.playerIds.map((playerId) => {
                        const player = players.find((p) => p._id === playerId);
                        if (!player) return null;

                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-neutral-800"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs sm:text-sm truncate text-gray-900 dark:text-neutral-100">{player.name}</span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                                  player.gender === "F"
                                    ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-200"
                                    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200"
                                }`}
                              >
                                {player.gender}
                              </span>
                            </div>
                            <button
                              onClick={() => removePlayerFromTeam(playerId, teamIndex)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer ml-2"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={saveSession}
              disabled={saving || !sessionName.trim()}
              className="w-full rounded-xl border border-green-600 dark:border-green-700 bg-green-600 dark:bg-green-600/90 text-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Création..." : "💾 Créer la séance"}
            </button>
          </section>
        </div>
      )}

      {teams.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-neutral-400 px-4">
          <p className="mb-4 text-sm sm:text-base">Configurez le nombre d&apos;équipes et cliquez sur &quot;Initialiser&quot; pour commencer</p>
        </div>
      )}
    </div>
  );
}