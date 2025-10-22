// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const Cat = {
  service: v.number(),
  reception: v.number(),
  passing: v.number(),
  smash: v.number(),
  defence: v.number(),
  bloc: v.number(),
} as const;

const schema = defineSchema({
 players: defineTable({
  id: v.string(),
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
  .index("by_checked", ["checked"])
  .index("by_name", ["name"])
});

export default schema; // ← REQUIRED