export type WebChatSession = {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
};

export type WebChatDeliverMessageParams = {
  threadId: string;
  content: string;
  richContent?: Record<string, unknown>;
  /**
   * Caller-supplied idempotent message id (embedded in the postable message by
   * callers that saw `supportsClientMessageIds`). Delivery uses it as the
   * platform message id; absent → delivery mints one.
   */
  messageId?: string;
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

export type WebChatStartTypingParams = {
  threadId: string;
  status?: string;
};

export type WebChatAuthorizeResumeParams = {
  conversationId: string;
  session: WebChatSession;
};

export type WebChatAdapterConfig = {
  userName?: string;
  verifySession: (request: Request) => Promise<WebChatSession | null>;
  /**
   * When the client supplies a conversation id, Nest ACL decides whether that
   * thread may be resumed (participant + web_chat + agent). Denied → adapter 404.
   */
  authorizeResume?: (params: WebChatAuthorizeResumeParams) => Promise<boolean>;
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
  /** HMAC of `agentId`; required when web-chat Security HMAC is enabled. */
  agentHash?: string;
  /** Exactly one of `text` | `actionId` per request. */
  text?: string;
  /** Interactive / approval button id (e.g. `tool-approval:approve:…`). XOR with `text`. */
  actionId?: string;
  /**
   * Platform message id of the clicked card/button.
   * Required with non-approval `actionId`; optional for approval action ids (headless).
   */
  sourceMessageId?: string;
  /** Optional button/select value alongside `actionId`. */
  value?: string;
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
