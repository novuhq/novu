export type WebChatSession = {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
};

export type WebChatDeliverMessageParams = {
  threadId: string;
  content: string;
  richContent?: Record<string, unknown>;
};

export type WebChatDeliverMessageResult = {
  id: string;
  threadId: string;
};

export type WebChatEditMessageParams = {
  threadId: string;
  messageId: string;
  content: string;
  richContent?: Record<string, unknown>;
};

export type WebChatDeleteMessageParams = {
  threadId: string;
  messageId: string;
};

export type WebChatAdapterConfig = {
  userName?: string;
  verifySession: (request: Request) => Promise<WebChatSession | null>;
  deliverMessage: (params: WebChatDeliverMessageParams) => Promise<WebChatDeliverMessageResult>;
  editMessage: (params: WebChatEditMessageParams) => Promise<WebChatDeliverMessageResult>;
  deleteMessage: (params: WebChatDeleteMessageParams) => Promise<void>;
};

/** Thread id is the durable conversation identifier (`conv_<shortId>`). */
export type WebChatThreadId = {
  conversationId: string;
};

export type WebChatRawMessage = {
  id: string;
  text: string;
  subscriberId: string;
  createdAt: string;
};

export type WebChatRequestBody = {
  agentId?: string;
  text?: string;
  /** Optional client conversation id — shape-validated; ignored for create-only routing. */
  id?: string;
  /** Optional client idempotency key (`msg_<shortId>`). */
  messageId?: string;
};
