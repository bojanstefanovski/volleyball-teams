"use client";

import type { PlayerFromDb, SortKey, SortDir } from "../../lib/types";

type PlayerTableDesktopProps = {
  loading: boolean;
  players: PlayerFromDb[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onToggle: (player: PlayerFromDb) => void;
  onEdit: (player: PlayerFromDb) => void;
};

const Arrow = ({ active, dir }: { active: boolean; dir: SortDir }) =>
  !active ? null : (
    <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>
  );

export function PlayerTableDesktop({
  loading,
  players,
  sortKey,
  sortDir,
  onSort,
  onToggle,
  onEdit,
}: PlayerTableDesktopProps) {
  return (
    <section className="hidden md:block rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm overflow-x-auto">
      {loading ? (
        <div className="p-2 text-gray-500 dark:text-neutral-400 text-sm">
          Chargement…
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-600 dark:text-neutral-400">
              <th className="px-2 py-2">✔</th>

              <th
                className="text-left px-2 py-2 cursor-pointer select-none"
                onClick={() => onSort("name")}
                title="Trier par nom"
              >
                Nom <Arrow active={sortKey === "name"} dir={sortDir} />
              </th>

              <th className="text-left px-2 py-2">Sexe</th>

              {(
                [
                  "service",
                  "reception",
                  "passing",
                  "smash",
                  "defence",
                  "bloc",
                ] as const
              ).map((k) => (
                <th
                  key={k}
                  className="text-right px-2 py-2 cursor-pointer select-none"
                  onClick={() => onSort(k)}
                  title={`Trier par ${k}`}
                >
                  {k === "service" && "Service"}
                  {k === "reception" && "Réception"}
                  {k === "passing" && "Passe"}
                  {k === "smash" && "Attaque"}
                  {k === "defence" && "Défense"}
                  {k === "bloc" && "Bloc"}
                  <Arrow active={sortKey === k} dir={sortDir} />
                </th>
              ))}

              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p._id}
                className={`border-t border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/60`}
              >
                <td className="px-2 py-2">
                  <button
                    onClick={() => onToggle(p)}
                    className={`h-5 w-5 rounded border cursor-pointer ${
                      p.checked
                        ? "bg-indigo-600 border-indigo-500"
                        : "bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"
                    }`}
                    aria-pressed={p.checked}
                    title="Présent"
                  />
                </td>
                <td
                  className={`px-2 py-2 ${
                    p.checked ? "text-gray-900 dark:text-white font-medium" : "text-gray-700 dark:text-neutral-300"
                  }`}
                >
                  {p.name}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      p.gender === "F"
                        ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-200"
                        : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200"
                    }`}
                  >
                    {p.gender}
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.service}
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.reception}
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.passing}
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.smash}
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.defence}
                </td>
                <td className="px-2 py-2 text-right text-gray-700 dark:text-neutral-300">
                  {p.categories.bloc}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => onEdit(p)}
                    className="rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
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
  );
}