export interface Group {
  id: number;
  name: string;
  memberIds: string[];
  memberNames: string[];
  unreadCount: number;
  hasHistory: boolean;
}
