"use client";

import CreatePlayerCard from "./create-player-card";
import ImportPlayersCard from "./import-players-card";

export default function PlayersAdminContainer() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des joueurs</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImportPlayersCard />
        <CreatePlayerCard />
      </div>
    </div>
  );
}