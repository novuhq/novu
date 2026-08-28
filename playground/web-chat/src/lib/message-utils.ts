import type { AgentMessage } from '@novu/react';

type AgentMessagePart = AgentMessage['parts'][number];

export function textOf(message: AgentMessage): string {
  return message.parts
    .filter((part): part is Extract<AgentMessagePart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function hasNonTextParts(message: AgentMessage): boolean {
  return message.parts.some((part) => part.type !== 'text');
}

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}
