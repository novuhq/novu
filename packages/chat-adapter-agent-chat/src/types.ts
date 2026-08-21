export type AgentChatSession = {
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  contextKeys?: string[];
};

export type AgentChatDeliverMessageParams = {
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

export type AgentChatDeliverMessageResult = {
  id: string;
  threadId: string;
};

export type AgentChatEditMessageParams = {
  threadId: string;
  messageId: string;
  content: string;
  richContent?: Record<string, unknown>;
};

export type AgentChatDeleteMessageParams = {
  threadId: string;
  messageId: string;
};

export type AgentChatStartTypingParams = {
  threadId: string;
  status?: string;
};

export type AgentChatAuthorizeResumeParams = {
  conversationId: string;
  session: AgentChatSession;
};

export type AgentChatAcceptLimitBlockReason = 'agents' | 'channels' | 'conversations';

export type AgentChatAcceptLimitBlock = {
  reason: AgentChatAcceptLimitBlockReason;
  message: string;
};

export type AgentChatCheckAcceptLimitsParams = {
  session: AgentChatSession;
  /** `true` when the client did not supply a resume conversation id. */
  isNewThread: boolean;
  /** Authorized resume id; omitted for brand-new threads. */
  conversationId?: string;
};

export type AgentChatClaimInboundMessageParams = {
  session: AgentChatSession;
  messageId: string;
  conversationId: string;
};

export type AgentChatClaimInboundActionParams = {
  session: AgentChatSession;
  idempotencyKey: string;
  conversationId: string;
};

export type AgentChatInboundClaimResult = {
  claimed: boolean;
  conversationId: string;
};

export type AgentChatAdapterConfig = {
  userName?: string;
  verifySession: (request: Request) => Promise<AgentChatSession | null>;
  /**
   * When the client supplies a conversation id, Nest ACL decides whether that
   * thread may be resumed (participant + agent_chat + agent). Denied → adapter 404.
   */
  authorizeResume?: (params: AgentChatAuthorizeResumeParams) => Promise<boolean>;
  /**
   * Sync plan-limit gate before minting a conversation id or dispatching the turn.
   * When blocked, the adapter returns HTTP 402 with `{ reason, message }`.
   */
  checkAcceptLimits?: (params: AgentChatCheckAcceptLimitsParams) => Promise<AgentChatAcceptLimitBlock | null>;
  /**
   * Atomic accept gate for inbound user messages. When `claimed` is false, ack with
   * `conversationId` without dispatching again.
   */
  claimInboundMessage?: (params: AgentChatClaimInboundMessageParams) => Promise<AgentChatInboundClaimResult>;
  /** Drop the in-flight message lock after dispatch fails so the same key can retry. */
  releaseInboundMessage?: (params: AgentChatClaimInboundMessageParams) => Promise<void>;
  /**
   * Atomic accept gate for action ingress. When `claimed` is false, ack with
   * `conversationId` without dispatching again.
   */
  claimInboundAction?: (params: AgentChatClaimInboundActionParams) => Promise<AgentChatInboundClaimResult>;
  /** Drop the in-flight action lock after dispatch fails so the same key can retry. */
  releaseInboundAction?: (params: AgentChatClaimInboundActionParams) => Promise<void>;
  deliverMessage: (params: AgentChatDeliverMessageParams) => Promise<AgentChatDeliverMessageResult>;
  editMessage: (params: AgentChatEditMessageParams) => Promise<AgentChatDeliverMessageResult>;
  deleteMessage: (params: AgentChatDeleteMessageParams) => Promise<void>;
  /** Live typing egress — Nest emits an ephemeral `channel.typing` envelope. */
  startTyping: (params: AgentChatStartTypingParams) => Promise<void>;
};

/** Thread id is the durable conversation identifier (`conv_<shortId>`). */
export type AgentChatThreadId = {
  conversationId: string;
};

export type AgentChatRawMessage = {
  id: string;
  text: string;
  subscriberId: string;
  createdAt: string;
  contextKeys?: string[];
};

export type AgentChatRequestBody = {
  agentId?: string;
  /** HMAC of `agentId`; required when agent-chat Security HMAC is enabled. */
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
   * When valid, used as the platform message id for idempotent accepts/retries.
   */
  messageId?: string;
  /** Client idempotency key for action accepts (`idem_<shortId>`). */
  idempotencyKey?: string;
};
