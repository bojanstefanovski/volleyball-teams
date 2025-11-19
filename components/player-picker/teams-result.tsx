/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

type TeamsResultProps = {
  teams: any[];
  showAverages: boolean;
  onToggleAverages: () => void;
  resultRef: React.RefObject<HTMLDivElement | null>;
};

export function TeamsResult({
  teams,
  showAverages,
  onToggleAverages,
  resultRef,
}: TeamsResultProps) {
  return (
    <section ref={resultRef} className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleAverages}
          className="text-xs rounded-md border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-900 px-3 py-1 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-800 cursor-pointer"
        >
          {showAverages
            ? "Masquer les notes moyennes"
            : "Afficher les notes moyennes"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t, i) => {
          const size = t.members.length || 1;
          const avg = {
            service:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.service,
                0
              ) / size,
            reception:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.reception,
                0
              ) / size,
            passing:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.passing,
                0
              ) / size,
            smash:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.smash,
                0
              ) / size,
            defence:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.defence,
                0
              ) / size,
            bloc:
              t.members.reduce(
                (s: number, m: any) => s + m.categories.bloc,
                0
              ) / size,
          };

          return (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Équipe {i + 1}
                </h3>
                <span className="text-xs text-gray-500 dark:text-neutral-400">
                  {size} joueur(s)
                </span>
              </div>

              {showAverages && (
                <div className="mb-3 text-[11px] text-gray-600 dark:text-neutral-400 grid grid-cols-3 gap-y-0.5 gap-x-3">
                  <span>
                    Serv.{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.service.toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Récep.{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.reception.toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Passe{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.passing.toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Attaq.{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.smash.toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Déf.{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.defence.toFixed(1)}
                    </span>
                  </span>
                  <span>
                    Bloc{" "}
                    <span className="text-gray-900 dark:text-neutral-100 font-medium">
                      {avg.bloc.toFixed(1)}
                    </span>
                  </span>
                </div>
              )}

              <ul className="text-sm text-gray-700 dark:text-neutral-300 divide-y divide-gray-200 dark:divide-neutral-800 grid grid-cols-2">
                {t.members.map((m: any) => (
                  <li key={m.id} className="py-2">
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}