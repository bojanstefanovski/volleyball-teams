"use client";

import type { PlayerFromDb } from "../../lib/types";

type PlayerListMobileProps = {
  loading: boolean;
  players: PlayerFromDb[];
  onToggle: (player: PlayerFromDb) => void;
  onEdit: (player: PlayerFromDb) => void;
};

export function PlayerListMobile({
  loading,
  players,
  onToggle,
  onEdit,
}: PlayerListMobileProps) {
  return (
    <section className="md:hidden rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      {loading ? (
        <div className="p-4 text-gray-500 dark:text-neutral-400 text-sm">
          Chargement…
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-neutral-800">
          {players.map((p) => {
            const isOn = !!p.checked;
            return (
              <li
                key={p._id}
                className={`px-4 py-3 transition-colors ${
                  isOn ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-white dark:bg-neutral-900"
                } hover:bg-gray-50 dark:hover:bg-neutral-800`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onToggle(p)}
                    className="text-left flex-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                      {p.name}
                    </span>
                  </button>
                  <button
                    onClick={() => onEdit(p)}
                    className="ml-3 rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
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
  );
}