"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { SessionDetail } from "./session-detail";

export function SessionsHistory() {
  const sessions = useQuery(api.sessions.listSessions, {});
  const [selectedSession, setSelectedSession] =
    useState<Id<"sessions"> | null>(null);

  if (sessions === undefined) {
    return (
      <div className="text-gray-500 dark:text-neutral-400 text-sm mt-10">
        Chargement des séances…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-gray-500 dark:text-neutral-500 text-sm mt-10">
        Aucune séance enregistrée.
      </div>
    );
  }

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("fr-FR");

  return (
    <div className="space-y-6 mt-10">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Séances enregistrées</h2>

      {/* Liste des sessions */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s._id}
            className="border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <div>
              <div className="text-gray-900 dark:text-neutral-100 font-medium">{s.name}</div>
              <div className="text-gray-500 dark:text-neutral-500 text-xs">
                Créée le {formatDateTime(s.createdAt)}
              </div>
            </div>
            <button
              onClick={() => setSelectedSession(s._id)}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-sm text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Voir
            </button>
          </div>
        ))}
      </div>

      {/* Affichage de la session sélectionnée */}
      {selectedSession && (
        <div className="mt-10">
          <SessionDetail sessionId={selectedSession} />
        </div>
      )}
    </div>
  );
}