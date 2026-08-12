export type AgentMessageRole = 'user' | 'assistant';

export type AgentToolSource = { type: 'builtin' } | { type: 'custom' } | { type: 'mcp'; serverName: string };

export type AgentToolResultContent =
  | { type: 'text'; text: string }
  | { type: 'citation'; url: string; title?: string; excerpts?: string[] }
  | { type: 'json'; value: unknown }
  | { type: 'media'; mediaType: string; data: string; name?: string }
  | { type: 'unknown'; providerType: string; data: Record<string, unknown> };

export type AgentMessageContent = { markdown: string } | { card: Record<string, unknown> };

export interface AgentFileRef {
  fileId: string;
  name?: string;
  mediaType?: string;
  /** Transitional: inline base64 payload until the pre-upload path ships. Same 5 MB limit as the reply API. */
  data?: string;
  /** Transitional: publicly-accessible URL until the pre-upload path ships. Same limits as the reply API. */
  url?: string;
}
