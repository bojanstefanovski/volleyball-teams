"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function PlayerStats() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"sessions"> | null>(null);

  const players = useQuery(api.players.listAll, {}) || [];
  const sessions = useQuery(api.sessions.listSessions, {}) || [];
  
  // Always call useQuery, but use "skip" when no player is selected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsResult = useQuery(
    api.playerStats.playerStatsWithTeammates,
    selectedPlayerId
      ? {
          playerId: selectedPlayerId,
          sessionId: selectedSessionId ?? undefined,
        }
      : "skip"
  ) as any;
  
  const stats = typeof statsResult === "string" ? null : statsResult;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Sélectionner un joueur
            </label>
            <select
              value={selectedPlayerId || ""}
              onChange={(e) => setSelectedPlayerId((e.target.value as Id<"players">) || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Choisir un joueur --</option>
              {players.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Filtrer par séance (optionnel)
            </label>
            <select
              value={selectedSessionId || ""}
              onChange={(e) => setSelectedSessionId((e.target.value as Id<"sessions">) || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Toutes les séances --</option>
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Display */}
        {stats && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Résumé des statistiques
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Matchs joués</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.played}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Victoires</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.summary.wins}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Défaites</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.summary.losses}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Taux de victoire</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {(stats.summary.winrate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Good Teammates */}
            {stats.goodTeammates.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ✅ Bons coéquipiers (≥60% victoires, ≥3 matchs)
                </h3>
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {stats.goodTeammates.map((teammate: any) => (
                    <div
                      key={teammate.playerId}
                      className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {teammate.playerName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                          {teammate.playedTogether} matchs ensemble
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {(teammate.winrateTogether * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                          {teammate.winsTogether}V - {teammate.lossesTogether}D
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bad Teammates */}
            {stats.badTeammates.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ❌ Mauvais coéquipiers (≤40% victoires, ≥3 matchs)
                </h3>
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {stats.badTeammates.map((teammate: any) => (
                    <div
                      key={teammate.playerId}
                      className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {teammate.playerName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                          {teammate.playedTogether} matchs ensemble
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {(teammate.winrateTogether * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                          {teammate.winsTogether}V - {teammate.lossesTogether}D
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Teammates */}
            {stats.teammates.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📊 Tous les coéquipiers
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-neutral-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          Joueur
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          Matchs
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          Victoires
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          Défaites
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          Taux
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {stats.teammates.map((teammate: any) => (
                        <tr
                          key={teammate.playerId}
                          className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            {teammate.playerName}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-600 dark:text-neutral-400">
                            {teammate.playedTogether}
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 dark:text-green-400 font-medium">
                            {teammate.winsTogether}
                          </td>
                          <td className="text-center py-3 px-4 text-red-600 dark:text-red-400 font-medium">
                            {teammate.lossesTogether}
                          </td>
                          <td className="text-center py-3 px-4 font-bold text-gray-900 dark:text-white">
                            {(teammate.winrateTogether * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.teammates.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 text-center">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Aucun coéquipier trouvé pour ce joueur
                </p>
              </div>
            )}
          </div>
        )}

        {!selectedPlayerId && (
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-8 text-center">
            <p className="text-gray-600 dark:text-neutral-400">
              Sélectionnez un joueur pour voir ses statistiques
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
