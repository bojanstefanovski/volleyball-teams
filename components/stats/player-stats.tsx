"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Teammate = {
  playerId: Id<"players">;
  playerName: string;
  playedTogether: number;
  winsTogether: number;
  lossesTogether: number;
  winrateTogether: number;
};

type PlayerStatsResult = {
  playerId: Id<"players">;
  summary: {
    played: number;
    wins: number;
    losses: number;
    winrate: number;
  };
  teammates: Teammate[];
  goodTeammates: Teammate[];
  badTeammates: Teammate[];
};

type PlayerSummary = {
  playerId: Id<"players">;
  playerName: string;
  played: number;
  wins: number;
  losses: number;
  winrate: number;
};

export function PlayerStats() {
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"sessions"> | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const players = useQuery(api.players.listAll, {}) || [];
  const sessions = useQuery(api.sessions.listSessions, {}) || [];
  
  // Get detailed stats for selected player
  const selectedPlayerStatsResult = useQuery(
    api.playerStats.playerStatsWithTeammates,
    selectedPlayerId
      ? {
          playerId: selectedPlayerId,
          sessionId: selectedSessionId ?? undefined,
        }
      : "skip"
  );
  
  const selectedPlayerStats = typeof selectedPlayerStatsResult === "string" ? null : (selectedPlayerStatsResult as PlayerStatsResult | undefined) ?? null;

  // Fetch all players stats
  const allPlayersStatsResult = useQuery(
    api.playerStats.allPlayersStats,
    {
      sessionId: selectedSessionId ?? undefined,
    }
  );
  
  const playerSummaries: PlayerSummary[] = (allPlayersStatsResult as PlayerSummary[] | undefined) ?? [];

  const handlePlayerClick = (playerId: Id<"players">) => {
    setSelectedPlayerId(playerId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlayerId(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="space-y-6">
        {/* Session Filter */}
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

        {/* Players Summary Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Statistiques des joueurs
          </h2>
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
                    Taux de victoire
                  </th>
                </tr>
              </thead>
              <tbody>
                {playerSummaries.map((player) => (
                  <tr
                    key={player.playerId}
                    onClick={() => handlePlayerClick(player.playerId)}
                    className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      {player.playerName}
                    </td>
                    <td className="text-center py-3 px-4 text-gray-600 dark:text-neutral-400">
                      {player.played}
                    </td>
                    <td className="text-center py-3 px-4 text-green-600 dark:text-green-400 font-medium">
                      {player.wins}
                    </td>
                    <td className="text-center py-3 px-4 text-red-600 dark:text-red-400 font-medium">
                      {player.losses}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-gray-900 dark:text-white">
                      {(player.winrate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedPlayerStats && typeof selectedPlayerStats !== "string" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Détails - {players.find((p) => p._id === selectedPlayerId)?.name}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Résumé des statistiques
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Matchs joués</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {selectedPlayerStats.summary.played}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Victoires</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {selectedPlayerStats.summary.wins}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Défaites</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {selectedPlayerStats.summary.losses}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Taux de victoire</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {(selectedPlayerStats.summary.winrate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Good Teammates */}
              {selectedPlayerStats.goodTeammates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ✅ Bons coéquipiers (≥60% victoires, ≥3 matchs)
                  </h3>
                  <div className="space-y-3">
                    {selectedPlayerStats.goodTeammates.map((teammate: Teammate) => (
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
              {selectedPlayerStats.badTeammates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ❌ Mauvais coéquipiers (≤40% victoires, ≥3 matchs)
                  </h3>
                  <div className="space-y-3">
                    {selectedPlayerStats.badTeammates.map((teammate: Teammate) => (
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
              {selectedPlayerStats.teammates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                        {selectedPlayerStats.teammates
                          .sort((a, b) => b.winsTogether - a.winsTogether)
                          .map((teammate: Teammate) => (
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

              {selectedPlayerStats.teammates.length === 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 text-center">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Aucun coéquipier trouvé pour ce joueur
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
