"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import * as XLSX from "xlsx";

type PlayerRow = {
  id?: string;
  name: string;
  gender: "M" | "F";
  mood?: number;
  categories: { service: number; reception: number; passing: number; smash: number; defence: number; bloc: number; };
  checked?: boolean;
};

const kebabId = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toNum = (v: unknown, fb = 5) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function rowToPlayer(r: Record<string, any>): PlayerRow | null {
  const name = String(r.name ?? r.Nom ?? "").trim();
  if (!name) return null;
  const gender: "M" | "F" = String(r.gender ?? r.Sexe ?? "M").toUpperCase() === "F" ? "F" : "M";
  const mood = toNum(r.mood ?? r.Mood, 5);

  const p: PlayerRow = {
    id: r.id ? String(r.id) : kebabId(name),
    name,
    gender,
    mood,
    categories: {
      service:  toNum(r.service  ?? r.Service),
      reception:toNum(r.reception?? r.Reception ?? r.Réception),
      passing:  toNum(r.passing  ?? r.Passe),
      smash:    toNum(r.smash    ?? r.Attaque),
      defence:  toNum(r.defence  ?? r.Defense ?? r.Défense),
      bloc:     toNum(r.bloc     ?? r.block ?? r.Bloc),
    },
    checked: String(r.checked ?? "").toLowerCase() === "true" ? true : true,
  };
  return p;
}

export default function ImportPlayersCard() {
  const importPlayers = useAction(api.players.importPlayers);
  const [busy, setBusy] = useState(false);
  const [okCount, setOkCount] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrMsg(null); setOkCount(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      let players: PlayerRow[] = [];

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const raw = JSON.parse(text);
        if (!Array.isArray(raw)) throw new Error("Le JSON doit être un tableau.");
        players = raw.map((p: any) => ({
          id: p.id ?? kebabId(String(p.name ?? "")),
          name: String(p.name),
          gender: (String(p.gender).toUpperCase() === "F" ? "F" : "M") as "M" | "F",
          mood: toNum(p.mood, 5),
          categories: {
            service:  toNum(p?.categories?.service),
            reception:toNum(p?.categories?.reception),
            passing:  toNum(p?.categories?.passing),
            smash:    toNum(p?.categories?.smash),
            defence:  toNum(p?.categories?.defence),
            bloc:     toNum(p?.categories?.bloc),
          },
          checked: typeof p.checked === "boolean" ? p.checked : true,
        }));
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        players = rows.map(rowToPlayer).filter(Boolean) as PlayerRow[];
      }

      if (players.length === 0) throw new Error("Aucune ligne valide détectée.");
      const res = await importPlayers({ players });
      setOkCount(res.count);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-neutral-900/60 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-lg font-semibold">Importer des joueurs</h3>
        {busy && <div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
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
          ✓ {okCount} joueur{okCount > 1 ? "s" : ""} importé{okCount > 1 ? "s" : ""}.
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