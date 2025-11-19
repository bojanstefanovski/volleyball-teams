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