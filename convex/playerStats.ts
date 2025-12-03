// convex/playerStats.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type Stat = {
  played: number;
  wins: number;
  losses: number;
};

export const playerStatsWithTeammates = query({
  args: {
    playerId: v.id("players"),
    // optionnel : limiter à une seule séance
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, { playerId, sessionId }) => {
    // 1. On récupère les équipes de la séance (ou toutes)
    const allTeams = sessionId
      ? await ctx.db
          .query("session_teams")
          .withIndex("by_session", (q) => q.eq("session_id", sessionId))
          .collect()
      : await ctx.db.query("session_teams").collect();

    // Équipes dans lesquelles le joueur apparaît
    const playerTeams = allTeams.filter((t) =>
      t.player_ids.some((id) => id === playerId)
    );

    if (playerTeams.length === 0) {
      return {
        playerId,
        summary: {
          played: 0,
          wins: 0,
          losses: 0,
          winrate: 0,
        },
        teammates: [],
        goodTeammates: [],
        badTeammates: [],
      };
    }

    const playerTeamIds = new Set(playerTeams.map((t) => t._id));

    const teamById = new Map(allTeams.map((t) => [t._id, t]));

    // 2. On récupère les matchs
    const allMatches = sessionId
      ? await ctx.db
          .query("session_matches")
          .withIndex("by_session", (q) => q.eq("session_id", sessionId))
          .collect()
      : await ctx.db.query("session_matches").collect();

    // On garde uniquement les matchs où le joueur est dans l'équipe A ou B
    const matches = allMatches.filter(
      (m) =>
        playerTeamIds.has(m.teamA_id) || playerTeamIds.has(m.teamB_id)
    );

    const playerStat: Stat = {
      played: 0,
      wins: 0,
      losses: 0,
    };

    // Map coéquipierId -> stats ensemble
    const teammateStats = new Map<
      Id<"players">,
      { playedTogether: number; winsTogether: number; lossesTogether: number }
    >();

    const ensureTeammate = (id: Id<"players">) => {
      let stat = teammateStats.get(id);
      if (!stat) {
        stat = { playedTogether: 0, winsTogether: 0, lossesTogether: 0 };
        teammateStats.set(id, stat);
      }
      return stat;
    };

    for (const match of matches) {
      if (match.scoreA == null || match.scoreB == null) continue;

      const teamA = teamById.get(match.teamA_id);
      const teamB = teamById.get(match.teamB_id);
      if (!teamA || !teamB) continue;

      const scoreA = match.scoreA;
      const scoreB = match.scoreB;

      const winner =
        scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : ("draw" as const);

      // Dans quelle équipe est le joueur ?
      const playerIsInA = teamA.player_ids.some((id) => id === playerId);
      const playerIsInB = teamB.player_ids.some((id) => id === playerId);

      if (!playerIsInA && !playerIsInB) continue; // par sécurité

      playerStat.played += 1;

      let playerWon: boolean | null = null;
      if (winner === "A" && playerIsInA) {
        playerWon = true;
      } else if (winner === "B" && playerIsInB) {
        playerWon = true;
      } else if (winner === "A" && playerIsInB) {
        playerWon = false;
      } else if (winner === "B" && playerIsInA) {
        playerWon = false;
      } else {
        playerWon = null; // égalité
      }

      if (playerWon === true) playerStat.wins += 1;
      if (playerWon === false) playerStat.losses += 1;

      // Coéquipiers sur ce match
      const playerTeam = playerIsInA ? teamA : teamB;
      const teammates = playerTeam.player_ids.filter((id) => id !== playerId);

      for (const mateId of teammates) {
        const ts = ensureTeammate(mateId);
        ts.playedTogether += 1;
        if (playerWon === true) ts.winsTogether += 1;
        if (playerWon === false) ts.lossesTogether += 1;
      }
    }

    const winrate =
      playerStat.played > 0 ? playerStat.wins / playerStat.played : 0;

    // 3. On récupère les infos des coéquipiers
    const teammateIds = Array.from(teammateStats.keys());
    const teammatesDocs = await Promise.all(
      teammateIds.map((id) => ctx.db.get(id))
    );

    const teammatesResult = teammateIds.map((id, idx) => {
      const mate = teammatesDocs[idx];
      const stat = teammateStats.get(id)!;
      const wr =
        stat.playedTogether > 0
          ? stat.winsTogether / stat.playedTogether
          : 0;

      return {
        playerId: id,
        playerName: mate?.name ?? "Inconnu",
        playedTogether: stat.playedTogether,
        winsTogether: stat.winsTogether,
        lossesTogether: stat.lossesTogether,
        winrateTogether: wr,
      };
    });

    // 4. Option : on découpe en "bons" et "mauvais" coéquipiers
    // (seuils arbitraires : >60% victoire & >=3 matchs ensemble)
    const goodTeammates = teammatesResult
      .filter((t) => t.playedTogether >= 3 && t.winrateTogether >= 0.6)
      .sort((a, b) => b.winrateTogether - a.winrateTogether);

    const badTeammates = teammatesResult
      .filter((t) => t.playedTogether >= 3 && t.winrateTogether <= 0.4)
      .sort((a, b) => a.winrateTogether - b.winrateTogether);

    // On peut aussi renvoyer la liste complète brute
    const allTeammatesSorted = teammatesResult.sort(
      (a, b) => b.winrateTogether - a.winrateTogether
    );

    return {
      playerId,
      summary: {
        played: playerStat.played,
        wins: playerStat.wins,
        losses: playerStat.losses,
        winrate,
      },
      teammates: allTeammatesSorted,
      goodTeammates,
      badTeammates,
    };
  },
});

export const allPlayersStats = query({
  args: {
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, { sessionId }) => {
    // Get all players
    const players = await ctx.db.query("players").collect();
    
    // Get stats for each player
    const allStats = await Promise.all(
      players.map(async (player) => {
        // 1. Get teams for this player
        const allTeams = sessionId
          ? await ctx.db
              .query("session_teams")
              .withIndex("by_session", (q) => q.eq("session_id", sessionId))
              .collect()
          : await ctx.db.query("session_teams").collect();

        const playerTeams = allTeams.filter((t) =>
          t.player_ids.some((id) => id === player._id)
        );

        if (playerTeams.length === 0) {
          return {
            playerId: player._id,
            playerName: player.name,
            played: 0,
            wins: 0,
            losses: 0,
            winrate: 0,
          };
        }

        const playerTeamIds = new Set(playerTeams.map((t) => t._id));

        // 2. Get matches
        const allMatches = sessionId
          ? await ctx.db
              .query("session_matches")
              .withIndex("by_session", (q) => q.eq("session_id", sessionId))
              .collect()
          : await ctx.db.query("session_matches").collect();

        const matches = allMatches.filter(
          (m) =>
            playerTeamIds.has(m.teamA_id) || playerTeamIds.has(m.teamB_id)
        );

        let played = 0;
        let wins = 0;
        let losses = 0;

        const teamById = new Map(allTeams.map((t) => [t._id, t]));

        for (const match of matches) {
          if (match.scoreA == null || match.scoreB == null) continue;

          const teamA = teamById.get(match.teamA_id);
          const teamB = teamById.get(match.teamB_id);
          if (!teamA || !teamB) continue;

          const scoreA = match.scoreA;
          const scoreB = match.scoreB;

          const winner =
            scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : ("draw" as const);

          const playerIsInA = teamA.player_ids.some((id) => id === player._id);
          const playerIsInB = teamB.player_ids.some((id) => id === player._id);

          if (!playerIsInA && !playerIsInB) continue;

          played += 1;

          if (winner === "A" && playerIsInA) {
            wins += 1;
          } else if (winner === "B" && playerIsInB) {
            wins += 1;
          } else if (winner === "A" && playerIsInB) {
            losses += 1;
          } else if (winner === "B" && playerIsInA) {
            losses += 1;
          }
        }

        const winrate = played > 0 ? wins / played : 0;

        return {
          playerId: player._id,
          playerName: player.name,
          played,
          wins,
          losses,
          winrate,
        };
      })
    );

    return allStats.sort((a, b) => b.winrate - a.winrate);
  },
});
