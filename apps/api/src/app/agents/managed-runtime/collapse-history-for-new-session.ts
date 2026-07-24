import { type Message, MessageRole } from '@novu/thalamus';

function messageText(content: Message['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function roleLabel(role: MessageRole): string {
  switch (role) {
    case MessageRole.ASSISTANT:
      return 'Assistant';
    case MessageRole.SYSTEM:
      return 'System';
    case MessageRole.USER:
      return 'User';
    default: {
      const _exhaustive: never = role;

      return _exhaustive;
    }
  }
}

/**
 * Anthropic sessions (via Thalamus `buildSendEvents`) run one live turn per
 * USER row. When a conversation reopens after resolve (`externalSessionId`
 * cleared), seeding the new session with the full U/A history would re-run
 * every prior turn and deliver all the regenerated replies to the channel.
 *
 * Collapse to at most two rows — one SYSTEM transcript of prior turns plus the
 * latest USER message — so Thalamus emits exactly one send event.
 *
 * The inbound handler persists the user message before dispatch, so the last
 * USER row in history is the current message. `fallbackUserText` only covers
 * histories without any USER row.
 */
export function collapseHistoryForNewSession(messages: Message[], fallbackUserText: string): Message[] {
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === MessageRole.USER) {
      lastUserIndex = i;
      break;
    }
  }

  if (lastUserIndex === -1) {
    return [{ role: MessageRole.USER, content: fallbackUserText }];
  }

  const latestUser = messages[lastUserIndex];
  const prior = messages.slice(0, lastUserIndex);

  if (prior.length === 0) {
    return [latestUser];
  }

  const transcript = prior.map((m) => `${roleLabel(m.role)}: ${messageText(m.content)}`).join('\n\n');

  return [
    {
      role: MessageRole.SYSTEM,
      content: `Prior conversation on this thread:\n\n${transcript}`,
    },
    latestUser,
  ];
}
