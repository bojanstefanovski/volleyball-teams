/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type SessionDetailProps = {
  sessionId: Id<"sessions">;
};

export function SessionDetail({ sessionId }: SessionDetailProps) {
  // 1) Données de la séance (session + teams = session_teams)
  const sessionData = useQuery(api.sessions.getSessionDetail, { sessionId });

  // 2) Matchs de la séance
  const matchesData = useQuery(api.matches.listBySession, { sessionId });

  // 3) Tous les joueurs (pour afficher les noms dans les équipes)
  const allPlayers = useQuery(api.players.listAll, {});

  // 4) Mutation pour mettre à jour les scores
  const setScore = useMutation(api.matches.setScore);

  // ---- Map des joueurs par _id (hook toujours appelé, même en chargement) ----
  const playerById = useMemo(() => {
    const map = new Map<Id<"players">, any>();
    if (!allPlayers) return map;
    for (const p of allPlayers) {
      map.set(p._id as Id<"players">, p);
    }
    return map;
  }, [allPlayers]);

  // ---- États de chargement / not found ----
  if (
    sessionData === undefined ||
    matchesData === undefined ||
    allPlayers === undefined
  ) {
    return (
      <section className="mt-10 text-sm text-neutral-400">
        Chargement de la séance…
      </section>
    );
  }

  if (sessionData === null) {
    return (
      <section className="mt-10 text-sm text-rose-400">
        Séance introuvable.
      </section>
    );
  }

  const { session, teams } = sessionData;
  const matches = matchesData;

  const formatDateTime = (ts: number | undefined) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString("fr-FR");
    } catch {
      return "";
    }
  };

  // Retrouver une équipe par son id + son numéro (1,2,3...) basé sur la position dans le tableau
  const getTeamLabel = (teamId: Id<"session_teams">) => {
    const idx = teams.findIndex((t: any) => t._id === teamId);
    const team = idx >= 0 ? teams[idx] : null;
    if (!team) return "Équipe ?";
    const num = idx + 1;
    return `Équipe ${num}`;
  };

  // On supporte les deux cas :
  // - matches.listBySession retourne directement le match
  // - OU retourne { match, teamA, teamB }
  const extractCoreMatch = (m: any) => (m.match ? m.match : m);

  const handleScoreChange = async (
    matchWrapper: any,
    side: "A" | "B",
    value: string
  ) => {
    const core = extractCoreMatch(matchWrapper);
    const n = Number(value);
    if (!Number.isFinite(n)) return;

    const scoreA = side === "A" ? n : core.scoreA ?? 0;
    const scoreB = side === "B" ? n : core.scoreB ?? 0;

    await setScore({
      matchId: core._id as Id<"session_matches">,
      scoreA,
      scoreB,
    });
  };

  return (
    <section className="mt-10 space-y-6">
      {/* Header séance */}
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-white">
          Séance : {session.name ?? "Sans nom"}
        </h2>
        <p className="text-xs text-neutral-400">
          Créée le {formatDateTime(session.createdAt)}
        </p>
      </header>

      {/* Équipes */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-neutral-100">
          Équipes de la séance
        </h3>
        {teams.length === 0 ? (
          <div className="text-xs text-neutral-500">
            Aucune équipe enregistrée pour cette séance.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((t: any, index: number) => (
              <div
                key={t._id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-neutral-100">
                    Équipe {index + 1}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {(t.player_ids as Id<"players">[]).length} joueur(s)
                  </span>
                </div>
                <ul className="text-neutral-200 space-y-1">
                  {(t.player_ids as Id<"players">[]).map((pid) => (
                    <li key={pid}>
                      {playerById.get(pid)?.name ??
                        `Joueur ${String(pid).slice(0, 4)}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matchs */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-neutral-100">
          Matchs (round robin)
        </h3>
        {matches.length === 0 ? (
          <div className="text-xs text-neutral-500">
            Aucun match généré pour cette séance.
          </div>
        ) : (
          // 2 matchs par ligne sur desktop
          <div className="grid md:grid-cols-2 gap-3">
            {matches.map((m: any) => {
              const core = extractCoreMatch(m);
              return (
                <div
                  key={core._id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 flex flex-col gap-2 text-sm"
                >
                  <div className="font-medium text-neutral-100">
                    {getTeamLabel(core.teamA_id)}{" "}
                    <span className="text-neutral-500 text-xs">vs</span>{" "}
                    {getTeamLabel(core.teamB_id)}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      className="w-16 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 text-center"
                      placeholder="A"
                      defaultValue={core.scoreA ?? ""}
                      onBlur={(e) =>
                        handleScoreChange(m, "A", e.target.value)
                      }
                    />
                    <span>-</span>
                    <input
                      type="number"
                      className="w-16 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100 text-center"
                      placeholder="B"
                      defaultValue={core.scoreB ?? ""}
                      onBlur={(e) =>
                        handleScoreChange(m, "B", e.target.value)
                      }
                    />
                    {core.court && (
                      <span className="ml-2 text-xs text-neutral-400">
                        Terrain : {core.court}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}