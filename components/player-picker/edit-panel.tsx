"use client";

import { useEffect, useState } from "react";
import type { PlayerFromDb, Categories } from "../../lib/types";
import { NoteInput } from "../shared/note-input";

type EditPanelProps = {
  open: boolean;
  onClose: () => void;
  player: PlayerFromDb | null;
  onSave: (p: PlayerFromDb) => Promise<void>;
  saving: boolean;
};

export function EditPanel({
  open,
  onClose,
  player,
  onSave,
  saving,
}: EditPanelProps) {
  const [form, setForm] = useState<PlayerFromDb | null>(player);
  useEffect(() => setForm(player), [player]);
  if (!open || !form) return null;

  const setCat = (k: keyof Categories, v: number) =>
    setForm({ ...form, categories: { ...form.categories, [k]: v } });

  const setField = <K extends keyof PlayerFromDb>(k: K, v: PlayerFromDb[K]) =>
    setForm({ ...form, [k]: v });

  const submit = async () => {
    await onSave(form);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800 shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Modifier le joueur</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 dark:border-neutral-700 px-2 py-1 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-gray-600 dark:text-neutral-300">Nom</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-600 dark:text-neutral-300">Sexe</span>
            <select
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value as "M" | "F")}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </label>

          <div className="mt-4 space-y-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4">
            <div className="text-gray-900 dark:text-neutral-200 font-medium">Catégories (1..10)</div>
            <NoteInput
              label="Service"
              value={form.categories.service}
              onChange={(v) => setCat("service", v)}
            />
            <NoteInput
              label="Réception"
              value={form.categories.reception}
              onChange={(v) => setCat("reception", v)}
            />
            <NoteInput
              label="Passe"
              value={form.categories.passing}
              onChange={(v) => setCat("passing", v)}
            />
            <NoteInput
              label="Attaque"
              value={form.categories.smash}
              onChange={(v) => setCat("smash", v)}
            />
            <NoteInput
              label="Défense"
              value={form.categories.defence}
              onChange={(v) => setCat("defence", v)}
            />
            <NoteInput
              label="Bloc"
              value={form.categories.bloc}
              onChange={(v) => setCat("bloc", v)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.checked}
              onChange={(e) => setField("checked", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
            Présent (checked)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 dark:border-neutral-700 px-3 py-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-md border border-indigo-600 dark:border-neutral-700 bg-indigo-600 dark:bg-indigo-600/90 text-white px-4 py-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}