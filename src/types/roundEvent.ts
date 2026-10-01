import type { TeamGameResult } from "./round";

export type RoundEventType =
  | 'INDIVIDUAL_LOW_NET'
  | 'INDIVIDUAL_LOW_GROSS'
  | 'TEAM_MIDDLE_MAN'
  | 'TEAM_ONE_TWO_THREE'
  | 'TEAM_TWO_MAN_LOW_NET'
  | 'TEAM_TWO_LOW_NET'
  | 'TEAM_THREE_LOW_NET'
  | 'TEAM_SCRAMBLE';

export interface RoundEventResponse {
  id: number | null;
  roundId: number;
  eventType: RoundEventType;
  eventName: string;
  eventOrder: number;
  active: boolean;
  usesGross: boolean;
  usesNet: boolean;
  usesTeams: boolean;
  teamSize: number | null;
  handicapPercent: number | null;
  teamBased?: boolean | null;
  individualEvent?: boolean | null;
  usesHandicap?: boolean | null;
  payoutEligible?: boolean | null;
  tournamentEligible?: boolean | null;
  scoringModeLabel?: string | null;
  defaultEventName?: string | null;
}

export interface SaveRoundEventItemRequest {
  eventType: RoundEventType;
  eventName?: string;
  eventOrder?: number;
  teamSize?: number | null;
  handicapPercent?: number | null;
  teamBased?: boolean | null;
  individualEvent?: boolean | null;
  usesHandicap?: boolean | null;
  payoutEligible?: boolean | null;
  tournamentEligible?: boolean | null;
  scoringModeLabel?: string | null;
  defaultEventName?: string | null;
}

export interface SaveRoundEventsRequest {
  events: SaveRoundEventItemRequest[];
}

export interface IndividualEventResult {
  playerId: number;
  playerName: string;
  grossTotal: number | null;
  netTotal: number | null;
  rank: number | null;
}

export interface RoundEventResultResponse {
  eventId: number | null;
  roundId: number;
  eventType: RoundEventType;
  eventName: string;
  eventOrder: number;
  resultKind: 'INDIVIDUAL' | 'TEAM';
  individualResults: IndividualEventResult[];
  teamResults: TeamGameResult[];
}

export interface RoundEventSnapshotRow {
  eventId: number | null;
  eventType: RoundEventType;
  eventName: string;
  resultKind: 'INDIVIDUAL' | 'TEAM';
  winnerName: string;
  winnerNames?: string[];
  winningTotal: number | null;
  rank: number | null;
  tied: boolean;
}

export interface RoundEventsResultResponse {
  roundId: number;
  events: RoundEventResultResponse[];
  snapshotRows: RoundEventSnapshotRow[];
}
