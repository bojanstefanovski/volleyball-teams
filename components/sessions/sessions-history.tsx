"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { SessionDetail } from "./session-detail";

export function SessionsHistory() {
  const sessions = useQuery(api.sessions.listSessions, {});
  const [selectedSession, setSelectedSession] =
    useState<Id<"sessions"> | null>(null);
  const deleteSession = useMutation(api.sessions.deleteSession);
  const [deletingId, setDeletingId] = useState<Id<"sessions"> | null>(null);

  const handleDelete = async (sessionId: Id<"sessions">) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.")) {
      return;
    }
    
    setDeletingId(sessionId);
    try {
      await deleteSession({ sessionId });
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la séance");
    } finally {
      setDeletingId(null);
    }
  };

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSession(s._id)}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-sm text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Voir
              </button>
              <button
                onClick={() => handleDelete(s._id)}
                disabled={deletingId === s._id}
                className="px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-700 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === s._id ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal pour afficher la session sélectionnée */}
      {selectedSession && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40"
            onClick={() => setSelectedSession(null)}
          />
          
          {/* Modal */}
          <div className="fixed inset-4 sm:inset-10 z-50 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Détails de la séance</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-md border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                ✕ Fermer
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              <SessionDetail sessionId={selectedSession} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}