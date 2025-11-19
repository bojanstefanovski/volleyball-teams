// convex/matches.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const setScore = mutation({
  args: {
    matchId: v.id("session_matches"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, { matchId, scoreA, scoreB }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Match not found");
    await ctx.db.patch(matchId, { scoreA, scoreB });
    return { ok: true as const };
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("session_matches")
      .withIndex("by_session", (q) => q.eq("session_id", sessionId))
      .order("asc")
      .collect();
  },
});