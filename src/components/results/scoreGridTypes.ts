import type { HoleScoreDto } from "../../types/round";

export type ScoreGridCellVariant = "default" | "counted" | "dropped" | "wd";

export type ScoreGridMetaRow = {
  label: string;
  values: Array<number | string | null | undefined>;
  out?: number | string | null;
  in?: number | string | null;
  total?: number | string | null;
};

export type ScoreGridPlayerRow = {
  key: string;
  playerName: string;
  courseHandicap?: number | null;
  grossValues: Array<number | null | undefined>;
  netValues: Array<number | null | undefined>;
  grossOut?: number | string | null;
  grossIn?: number | string | null;
  grossTotal?: number | string | null;
  netOut?: number | string | null;
  netIn?: number | string | null;
  netTotal?: number | string | null;
  participationStatus?: string | null;
  withdrawalHoleNumber?: number | null;
  netCellVariants: ScoreGridCellVariant[];
};

export type ScoreGridAggregateRow = {
  label: string;
  values: Array<number | null | undefined>;
  out?: number | null;
  in?: number | null;
  total?: number | null;
  rankLabel?: string;
};

export type ScoreGridSection = {
  key: string;
  teamName: string;
  players: ScoreGridPlayerRow[];
  aggregate: ScoreGridAggregateRow;
};

export type ScoreGridData = {
  title: string;
  subtitle?: string;
  holes: number[];
  metaRows: ScoreGridMetaRow[];
  sections: ScoreGridSection[];
};

export type ScoreGridBuildContext = {
  format?: string | null;
  holes: number[];
  holeMeta: HoleScoreDto[];
};
