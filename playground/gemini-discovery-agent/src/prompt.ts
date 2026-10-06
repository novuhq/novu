import type { AgentHandlerContext } from '@novu/framework/express';
import { agents } from './config.ts';

export function describeAgents({ withIds }: { withIds: boolean }): string {
  return agents.map((agent) => `- ${withIds ? `${agent.id}: ` : ''}${agent.name} — ${agent.description}`).join('\n');
}

/** Novu history roles are sender types: `subscriber` / `platform_user` (people), `agent`, `system`. */
const AGENT_ROLE = 'agent';
const RECENT_MESSAGES = 12;

/**
 * The latest message, preceded by the last messages of the conversation (truncated, ~1.5k tokens).
 * In a Slack thread these include what was said before the agent was mentioned.
 */
export function conversationPrompt(history: AgentHandlerContext['history'], text: string): string {
  const messages = history.filter((entry) => entry.type === 'message' && entry.role !== 'system' && entry.content?.trim());
  // The history may already include the message being handled.
  const last = messages.at(-1);
  if (last && last.role !== AGENT_ROLE && last.content.trim() === text) messages.pop();

  const recent = messages
    .slice(-RECENT_MESSAGES)
    .map((entry) =>
      entry.role === AGENT_ROLE
        ? `Agent: ${truncate(entry.content, 800)}`
        : `${entry.senderName || 'User'}: ${truncate(entry.content, 400)}`
    );

  return [...(recent.length ? ['Recent conversation:', ...recent, ''] : []), `Latest message: ${text}`].join('\n');
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
