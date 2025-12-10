import { Id } from "../convex/_generated/dataModel";

/** Genre du joueur */
export type Gender = "M" | "F";

/** Catégories de compétences d'un joueur (1-10) */
export type Categories = {
  service: number;
  reception: number;
  passing: number;
  smash: number;
  defence: number;
  bloc: number;
};

/** Joueur pour l'algorithme de génération d'équipes */
export type PlayerAlgo = {
  id: string;
  name: string;
  gender: Gender;
  mood?: number;
  categories: Categories;
};

/** Joueur tel que stocké dans la base de données (avec _id Convex) */
export type PlayerFromDb = PlayerAlgo & {
  _id: Id<"players">;
  checked: boolean;
};

/** Format pour l'import/export de joueurs */
export type PlayerRow = {
  id?: string;
  name: string;
  gender: Gender;
  mood?: number;
  categories: Categories;
  checked?: boolean;
};

/** Équipe pour la création de session */
export type TeamPayload = {
  name: string;
  playerIds: Id<"players">[];
};

/** Modes d'équilibrage des équipes */
export type BalanceMode = "overall" | "perCategory" | "hybrid";

/** Clés de tri pour les joueurs */
export type SortKey =
  | "name"
  | "service"
  | "reception"
  | "passing"
  | "smash"
  | "defence"
  | "bloc";

/** Direction de tri */
export type SortDir = "asc" | "desc";

/** Contrainte pour forcer des joueurs à jouer ensemble */
export type PlayerConstraint = {
  playerIds: string[]; // IDs des joueurs qui doivent jouer ensemble
  label?: string; // Label optionnel pour identifier la contrainte (ex: "Duo A")
  targetTeam?: number; // Numéro de l'équipe cible (1-based, optionnel)
  preferredTeamSize?: number; // Taille d'équipe préférée (4, 5 ou 6 joueurs)
};

export type Teammate = {
  playerId: Id<"players">;
  playerName: string;
  playedTogether: number;
  winsTogether: number;
  lossesTogether: number;
  winrateTogether: number;
};

export type PlayerStatsResult = {
  playerId: Id<"players">;
  summary: {
    played: number;
    wins: number;
    losses: number;
    winrate: number;
  };
  teammates: Teammate[];
  goodTeammates: Teammate[];
  badTeammates: Teammate[];
};