export interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: string;
  confidence?: number;
  relatedTickets?: string[];
  isStreaming?: boolean;
}