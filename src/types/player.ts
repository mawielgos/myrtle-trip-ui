export interface PlayerListItem {
  id: number;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  ghinNumber?: string | null;
  active: boolean;
  handicapMethod?: string | null;
}