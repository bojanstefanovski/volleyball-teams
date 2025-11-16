"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { SessionDetail } from "./session-detail";

export function SessionsHistory() {
  const sessions = useQuery(api.sessions.listSessions, {});
  const [selectedSession, setSelectedSession] =
    useState<Id<"sessions"> | null>(null);

  if (sessions === undefined) {
    return (
      <div className="text-neutral-400 text-sm mt-10">
        Chargement des séances…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-neutral-500 text-sm mt-10">
        Aucune séance enregistrée.
      </div>
    );
  }

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("fr-FR");

  return (
    <div className="space-y-6 mt-10">
      <h2 className="text-xl font-semibold text-white">Séances enregistrées</h2>

      {/* Liste des sessions */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s._id}
            className="border border-neutral-800 bg-neutral-900 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-neutral-100 font-medium">{s.name}</div>
              <div className="text-neutral-500 text-xs">
                Créée le {formatDateTime(s.createdAt)}
              </div>
            </div>
            <button
              onClick={() => setSelectedSession(s._id)}
              className="px-3 py-1.5 rounded-md border border-neutral-700 text-sm text-neutral-200 hover:bg-neutral-800 cursor-pointer"
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