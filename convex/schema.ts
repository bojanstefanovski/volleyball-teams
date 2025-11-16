// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==== table déjà existante ====
  players: defineTable({
    id: v.string(), // id "fonctionnel" (externe)
    name: v.string(),
    gender: v.union(v.literal("M"), v.literal("F")),
    mood: v.number(),
    categories: v.object({
      service: v.number(),
      reception: v.number(),
      passing: v.number(),
      smash: v.number(),
      defence: v.number(),
      bloc: v.number(),
    }),
    checked: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_checked", ["checked"]),

  // ==== nouvelle table : séances ====
  sessions: defineTable({
    name: v.string(),      // ex: "Séance du 12/03"
    createdAt: v.number(), // Date.now()
  }).index("by_createdAt", ["createdAt"]),

  // ==== équipes d'une séance ====
  session_teams: defineTable({
    session_id: v.id("sessions"),
    name: v.string(), // ex: "Équipe 1"
    player_ids: v.array(v.id("players")),
    createdAt: v.number(),
  }).index("by_session", ["session_id"]),

  // ==== matchs d'une séance ====
  session_matches: defineTable({
    session_id: v.id("sessions"),
    teamA_id: v.id("session_teams"),
    teamB_id: v.id("session_teams"),
    scoreA: v.optional(v.number()),
    scoreB: v.optional(v.number()),
    court: v.optional(v.string()), // terrain n°1 / etc (optionnel)
    createdAt: v.number(),
  }).index("by_session", ["session_id"]),
});