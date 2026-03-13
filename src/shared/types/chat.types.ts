export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  text: string;
  timestamp;
}
