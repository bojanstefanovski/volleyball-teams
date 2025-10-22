"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import * as XLSX from "xlsx";

/** ===== Types ===== */
type Gender = "M" | "F";

type PlayerRow = {
  id?: string;
  name: string;
  gender: Gender;
  mood?: number;
  categories: {
    service: number;
    reception: number;
    passing: number;
    smash: number;
    defence: number;
    bloc: number;
  };
  checked?: boolean;
};

type RawRow = Record<string, unknown>;

interface ImportResult {
  ok: true;
  count: number;
}

/** ===== Small utils (typed) ===== */
const kebabId = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toNum = (v: unknown, fb = 5): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const toStr = (v: unknown): string => (typeof v === "string" ? v : String(v ?? ""));

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/** coerce "F" | "M" (defaults to "M") */
const toGender = (v: unknown): Gender =>
  toStr(v).trim().toUpperCase() === "F" ? "F" : "M";

/** coerce boolean with default */
const toBool = (v: unknown, defaultVal = true): boolean => {
  if (typeof v === "boolean") return v;
  const s = toStr(v).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return defaultVal;
};

/** Map row → PlayerRow (typed) */
function rowToPlayer(r: RawRow): PlayerRow | null {
  const nameRaw = r.name ?? r.Nom;
  const name = toStr(nameRaw).trim();
  if (!name) return null;

  const gender = toGender(r.gender ?? r.Sexe);
  const mood = toNum(r.mood ?? r.Mood, 5);

  const player: PlayerRow = {
    id: r.id ? toStr(r.id) : kebabId(name),
    name,
    gender,
    mood,
    categories: {
      service: toNum(r.service ?? r.Service),
      reception: toNum(r.reception ?? (r as RawRow)["Réception"] ?? r.Reception),
      passing: toNum(r.passing ?? r.Passe),
      smash: toNum(r.smash ?? r.Attaque),
      defence: toNum(r.defence ?? (r as RawRow)["Défense"] ?? r.Defense),
      bloc: toNum(r.bloc ?? r.block ?? r.Bloc),
    },
    // default = true, but respect explicit "false"
    checked: toBool(r.checked, true),
  };

  return player;
}

export default function ImportPlayersCard() {
  const importPlayers = useAction(api.players.importPlayers);
  const [busy, setBusy] = useState(false);
  const [okCount, setOkCount] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrMsg(null);
    setOkCount(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      let players: PlayerRow[] = [];

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          throw new Error("Le JSON doit être un tableau d'objets.");
        }

        players = parsed
          .map((item): PlayerRow | null => {
            if (!isRecord(item)) return null;

            const categoriesRaw = isRecord(item.categories)
              ? item.categories
              : ({} as RawRow);

            const p: PlayerRow = {
              id: item.id ? toStr(item.id) : kebabId(toStr(item.name ?? "")),
              name: toStr(item.name),
              gender: toGender(item.gender),
              mood: toNum(item.mood, 5),
              categories: {
                service: toNum(categoriesRaw.service),
                reception: toNum(categoriesRaw.reception),
                passing: toNum(categoriesRaw.passing),
                smash: toNum(categoriesRaw.smash),
                defence: toNum(categoriesRaw.defence),
                bloc: toNum(categoriesRaw.bloc),
              },
              checked: typeof item.checked === "boolean" ? item.checked : true,
            };

            if (!p.name) return null;
            return p;
          })
          .filter((p): p is PlayerRow => p !== null);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
        players = rows
          .map((r) => rowToPlayer(r))
          .filter((p): p is PlayerRow => p !== null);
      }

      if (players.length === 0) throw new Error("Aucune ligne valide détectée.");

      const res: ImportResult = await importPlayers({ players });
      setOkCount(res.count);
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      // reset file input
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-neutral-900/60 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-lg font-semibold">Importer des joueurs</h3>
        {busy && (
          <div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <p className="text-sm text-neutral-300">
        Fichiers acceptés : <code>.json</code> (Player[]) ou <code>.xlsx/.xls</code>.
      </p>

      <input
        type="file"
        accept=".json,.xlsx,.xls"
        onChange={onFile}
        disabled={busy}
        className="block w-full text-neutral-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 disabled:opacity-60"
      />

      {okCount !== null && !busy && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-sm">
          ✓ {okCount} joueur{okCount > 1 ? "s" : ""} importé
          {okCount > 1 ? "s" : ""}.
        </div>
      )}
      {errMsg && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-300 text-sm">
          Erreur : {errMsg}
        </div>
      )}
    </div>
  );
}