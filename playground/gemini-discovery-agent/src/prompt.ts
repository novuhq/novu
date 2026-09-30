import type { AgentHandlerContext } from '@novu/framework/express';
import { agents } from './config.ts';

export function describeAgents({ withIds }: { withIds: boolean }): string {
  return agents.map((agent) => `- ${withIds ? `${agent.id}: ` : ''}${agent.name} — ${agent.description}`).join('\n');
}

/** The latest message, preceded by the last 3 user messages and the last reply (truncated, ~600 tokens). */
export function conversationPrompt(history: AgentHandlerContext['history'], text: string): string {
  const messages = history.filter((entry) => entry.type === 'message' && entry.content?.trim());
  // The history may already include the message being handled.
  if (messages.at(-1)?.role === 'user' && messages.at(-1)?.content.trim() === text) messages.pop();

  const users = messages.filter((entry) => entry.role === 'user').slice(-3);
  const reply = messages.filter((entry) => entry.role === 'assistant').at(-1);
  const recent = [
    ...users.map((entry) => `User: ${truncate(entry.content, 400)}`),
    ...(reply ? [`Last agent reply: ${truncate(reply.content, 800)}`] : []),
  ];

  return [...(recent.length ? ['Recent conversation:', ...recent, ''] : []), `Latest message: ${text}`].join('\n');
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
