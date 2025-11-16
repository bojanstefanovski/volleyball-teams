// convex/sessions.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/** helper round-robin : toutes les paires i < j */
function roundRobin<T>(arr: T[]): [T, T][] {
  const res: [T, T][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      res.push([arr[i], arr[j]]);
    }
  }
  return res;
}

// Créer une séance + ses équipes à partir du front
// ET créer automatiquement les matchs (round robin)
export const createSessionWithTeams = mutation({
  args: {
    name: v.string(),
    teams: v.array(
      v.object({
        name: v.string(),
        playerIds: v.array(v.id("players")),
      })
    ),
  },
  handler: async (ctx, { name, teams }) => {
    const now = Date.now();

    // 1) on crée la séance
    const sessionId = await ctx.db.insert("sessions", {
      name,
      createdAt: now,
    });

    // 2) on crée les équipes de la séance
    const createdTeams: { _id: Id<"session_teams">; name: string }[] = [];

    for (const t of teams) {
      const teamId = await ctx.db.insert("session_teams", {
        session_id: sessionId,
        name: t.name,
        player_ids: t.playerIds,
        createdAt: now,
      });
      createdTeams.push({ _id: teamId, name: t.name });
    }

    // 3) on génère les matchs round-robin dans session_matches
    const pairs = roundRobin(createdTeams);
    for (const [A, B] of pairs) {
      await ctx.db.insert("session_matches", {
        session_id: sessionId,
        teamA_id: A._id,
        teamB_id: B._id,
        createdAt: now,
        // scoreA / scoreB / court restent undefined au début
      });
    }

    return { sessionId, teams: createdTeams };
  },
});

// Lister les séances (historique)
export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

// Détail d'une séance : juste séance + équipes (avec player_ids)
export const getSessionDetail = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const teams = await ctx.db
      .query("session_teams")
      .withIndex("by_session", (q) => q.eq("session_id", sessionId))
      .order("asc")
      .collect();

    // pas besoin d'hydrater les joueurs ici, le front sait le faire
    return { session, teams };
  },
});