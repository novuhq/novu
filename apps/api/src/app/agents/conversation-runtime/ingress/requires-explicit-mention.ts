import type { Message, Thread } from 'chat';

export function requiresExplicitMention(thread: Thread, message: Message): boolean {

  return !thread.isDM && message.isMention !== true;
}
