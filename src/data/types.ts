export type ConversationStatus = "unresolved" | "escalated" | "resolved";
export type MessageRole = "user" | "assistant" | "system";
export type ContentType = "text" | "tool_call";

export interface ContactSession {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  metadata: {
    os: string;
    browser: string;
    location: string;
    timezone: string;
  };
  expiresAt: number;
}

export interface Conversation {
  id: string;
  threadId: string;
  contactSessionId: string;
  organizationId: string;
  status: ConversationStatus;
  lastMessage: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  contentType: ContentType;
  createdAt: number;
}
