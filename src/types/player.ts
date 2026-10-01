export interface PlayerListItem {
  playerId: number;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  ghinNumber?: string | null;
  active: boolean;
  handicapMethod?: string | null;
  email?: string | null;
  cell?: string | null;
  gender?: string | null;
}

export interface PlayerDetail {
  playerId: number;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  ghinNumber?: string | null;
  active: boolean;
  email?: string | null;
  cell?: string | null;
  venmoId?: string | null;
  zelleId?: string | null;
  handicapMethod?: string | null;
  gender?: string | null;
}

export interface SavePlayerRequest {
  firstName: string;
  lastName: string;
  displayName: string;
  ghinNumber: string;
  active: boolean;
  email: string;
  cell: string;
  venmoId: string;
  zelleId: string;
  handicapMethod: string;
  gender: string;
}
