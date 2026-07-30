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
  /** Conversation-global delivery sequence allocated at live emit time. */
  sequence?: number;
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

export type WebChatStartTypingParams = {
  threadId: string;
  status?: string;
};

export type WebChatAuthorizeResumeParams = {
  conversationId: string;
  session: WebChatSession;
};

export type WebChatProvisionInboundParams = {
  conversationId: string;
  threadId: string;
  messageId: string;
  text: string;
  session: WebChatSession;
};

/**
 * Opaque source-event context carried through adapter egress ops.
 * Nest stores an `AgentEventEnvelope` (or factory inputs); the package stays
 * free of protocol / Nest dependencies.
 */
export type WebChatEventContext = unknown;

export type WebChatAdapterConfig = {
  userName?: string;
  verifySession: (request: Request) => Promise<WebChatSession | null>;
  /**
   * When the client supplies a conversation id, Nest ACL decides whether that
   * thread may be resumed (participant + web_chat + agent). Denied → adapter 404.
   */
  authorizeResume?: (params: WebChatAuthorizeResumeParams) => Promise<boolean>;
  /**
   * Awaited before `201` so conversation, participant, and user activity are
   * durable (and the room addressable) even when a later policy gate blocks.
   */
  provisionInbound?: (params: WebChatProvisionInboundParams) => Promise<void>;
  deliverMessage: (params: WebChatDeliverMessageParams) => Promise<WebChatDeliverMessageResult>;
  editMessage: (params: WebChatEditMessageParams) => Promise<WebChatDeliverMessageResult>;
  deleteMessage: (params: WebChatDeleteMessageParams) => Promise<void>;
  /** Live typing egress — Nest emits an ephemeral `channel.typing` envelope. */
  startTyping: (params: WebChatStartTypingParams) => Promise<void>;
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
  /** Resume an existing conversation (`conv_*`). Alias of `conversationIdentifier`. */
  id?: string;
  /** Preferred resume field (NV-8441); same semantics as `id`. */
  conversationIdentifier?: string;
  /**
   * Reserved: client idempotency key (`msg_<shortId>`).
   * Still ignored — minting a server message id avoids ghost acks on retries.
   */
  messageId?: string;
};
