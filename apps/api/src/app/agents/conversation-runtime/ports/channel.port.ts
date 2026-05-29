/**
 * Polymorphic delivery channel — abstracts the transport
 * so the runtime layer doesn't care if it's chat-sdk or email.
 */
export interface Channel {
  readonly kind: 'chat' | 'email';

  post(msg: ChannelMessage): Promise<ChannelReceipt>;

  edit(messageId: string, msg: ChannelMessage): Promise<ChannelReceipt>;

  sendDirect(subscriberId: string, msg: ChannelMessage): Promise<ChannelReceipt>;

  startTyping?(): Promise<void>;

  react?(messageId: string, emoji: string): Promise<void>;

  removeReaction?(messageId: string, emoji: string): Promise<void>;
}

export interface ChannelTarget {
  agentId: string;
  integrationIdentifier: string;
  platform: string;
  platformThreadId: string;
}

export interface ChannelMessage {
  markdown?: string;
  card?: Record<string, unknown>;
  files?: Array<{ url?: string; data?: string; filename?: string; mimeType?: string }>;
}

export interface ChannelReceipt {
  messageId: string;
  platformThreadId?: string;
}
