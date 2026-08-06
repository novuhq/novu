export type SendMessageArgs = {
  agentId: string;
  text: string;
  /** Resume an existing conversation. Omit to start a new one. */
  conversationId?: string;
};

export type SendMessageResult = {
  conversationId: string;
};
