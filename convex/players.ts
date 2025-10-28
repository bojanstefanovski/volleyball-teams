import { v } from "convex/values";
import { query, mutation, action, ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";

export type Gender = "M" | "F";

export const categoriesValidator = v.object({
  service: v.number(),
  reception: v.number(),
  passing: v.number(),
  smash: v.number(),
  defence: v.number(),
  bloc: v.number(),
});

export const playerValidator = v.object({
  id: v.optional(v.string()),
  name: v.string(),
  gender: v.union(v.literal("M"), v.literal("F")),
  mood: v.optional(v.number()),
  categories: categoriesValidator,
  checked: v.optional(v.boolean()),
});

/* ====================== QUERIES ====================== */

export const list = query({
  args: { onlyChecked: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.onlyChecked) {
      // ✅ Pas de réassignation: branche directe avec withIndex
      return await ctx.db
        .query("players")
        .withIndex("by_checked", (iq) => iq.eq("checked", true))
        .collect();
    }
    // Branche sans index
    return await ctx.db.query("players").collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("players").collect();
  },
});

/* ==================== MUTATIONS ====================== */

export const toggleChecked = mutation({
  args: { _id: v.id("players"), checked: v.boolean() },
  handler: async (ctx, { _id, checked }) => {
    await ctx.db.patch(_id, { checked });
    return { ok: true as const };
  },
});

export const upsertOne = mutation({
  args: playerValidator,
  handler: async (ctx, p) => {
    // si id fourni, on tente par name (id lisible côté app), sinon by_name
    const existing = await ctx.db
      .query("players")
      .withIndex("by_name", (iq) => iq.eq("name", p.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gender: p.gender,
        mood: p.mood ?? existing.mood ?? 5,
        categories: p.categories,
        checked: p.checked ?? existing.checked ?? false,
      });
      return existing._id;
    }

    return await ctx.db.insert("players", {
      id: p.id ?? crypto.randomUUID(),
      name: p.name,
      gender: p.gender,
      mood: p.mood ?? 5,
      categories: p.categories,
      checked: p.checked ?? false,
    });
  },
});

export const bulkUpsert = mutation({
  args: { players: v.array(playerValidator) },
  handler: async (ctx, { players }) => {
    let updated = 0;
    for (const p of players) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_name", (iq) => iq.eq("name", p.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          gender: p.gender,
          mood: p.mood ?? existing.mood ?? 5,
          categories: p.categories,
          checked: p.checked ?? existing.checked ?? false,
        });
      } else {
        await ctx.db.insert("players", {
          id: p.id ?? crypto.randomUUID(),
          name: p.name,
          gender: p.gender,
          mood: p.mood ?? 5,
          categories: p.categories,
          checked: p.checked ?? false,
        });
      }
      updated++;
    }
    // ✅ ok typé comme littéral
    return { ok: true as const, count: updated };
  },
});

export const updatePlayerByName = mutation({
  args: {
    name: v.string(),
    mood: v.optional(v.number()),
    categories: v.optional(categoriesValidator),
    checked: v.optional(v.boolean()),
  },
  handler: async (ctx, { name, mood, categories, checked }) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!existing) {
      throw new Error(`Player with name "${name}" not found`);
    }

    await ctx.db.patch(existing._id, {
      ...(mood !== undefined ? { mood } : {}),
      ...(categories ? { categories } : {}),
      ...(checked !== undefined ? { checked } : {}),
    });

    return { ok: true as const, _id: existing._id };
  },
});

export const uncheckAll = mutation({
  args: {},
  handler: async (ctx) => {
    const checked = await ctx.db
      .query("players")
      .withIndex("by_checked", q => q.eq("checked", true)) // ⚠️ Nécessite un index si tu veux optimiser
      .collect();

    // si tu n'as pas d'index by_checked, remplace par:
    // const checked = (await ctx.db.query("players").collect()).filter(p => p.checked === true);

    for (const p of checked) {
      await ctx.db.patch(p._id, { checked: false });
    }
    return { updated: checked.length };
  },
});
/* ====================== ACTIONS ====================== */

type BulkUpsertResult = { ok: true; count: number };

type PlayerInput = {
  id?: string;
  name: string;
  gender: "M" | "F";
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

export const importPlayers = action({
  args: { players: v.array(playerValidator) },
  handler: async (
    ctx: ActionCtx,
    { players }: { players: PlayerInput[] }
  ): Promise<BulkUpsertResult> => {
    const res: BulkUpsertResult = await ctx.runMutation(
      api.players.bulkUpsert,
      { players }
    );
    return { ok: true as const, count: res.count };
  },
});