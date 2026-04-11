export interface GroupMessage {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  senderProfilePicture: string;
  content: string;
  createdDate: string;
  isRead: boolean;
}
