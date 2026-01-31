// Types del Ranking
export interface Player {
  id: string;
  name: string;
  avatar?: string;
}

export interface RankingEntry {
  player: Player;
  score: number;
  position: number;
}
