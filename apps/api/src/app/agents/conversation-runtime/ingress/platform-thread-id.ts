import type { AgentAction } from '@novu/framework';
import type { Message, Thread } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { asRecord } from '../../shared/util/raw-record';

const NESTED_THREAD_PLATFORMS = new Set<AgentPlatformEnum>([AgentPlatformEnum.SLACK, AgentPlatformEnum.TEAMS]);

function getMessageRawEvent(message: Message): Record<string, unknown> | undefined {
  const raw = asRecord(message.raw);

  return asRecord(raw?.event) ?? raw;
}

function slackStyleThreadRoot(message: Message): string | undefined {
  const rawEvent = getMessageRawEvent(message);
  const rawThreadTs = rawEvent?.thread_ts;

  if (typeof rawThreadTs === 'string' && rawThreadTs.length > 0) {
    return rawThreadTs;
  }

  return message.id;
}

export function supportsNestedThreads(platform: AgentPlatformEnum): boolean {
  return NESTED_THREAD_PLATFORMS.has(platform);
}

export function getInboundPlatformThreadId(platform: AgentPlatformEnum, thread: Thread, message: Message): string {
  const threadRoot = slackStyleThreadRoot(message);

  if (!supportsNestedThreads(platform) || !threadRoot || !thread.id.endsWith(':')) {
    return thread.id;
  }

  return `${thread.id}${threadRoot}`;
}

export function getActionPlatformThreadId(platform: AgentPlatformEnum, thread: Thread, action: AgentAction): string {
  if (!supportsNestedThreads(platform) || !action.sourceMessageId || !thread.id.endsWith(':')) {
    return thread.id;
  }

  return `${thread.id}${action.sourceMessageId}`;
}

export function isNestedSharedThread(platform: AgentPlatformEnum, thread: Thread, platformThreadId: string): boolean {
  if (thread.isDM || !supportsNestedThreads(platform)) {
    return false;
  }

  const channelId = thread.channelId;

  if (!channelId) {
    return platformThreadId.includes(':') && !platformThreadId.endsWith(':');
  }

  if (platformThreadId === channelId || platformThreadId === `${channelId}:`) {
    return false;
  }

  return platformThreadId.startsWith(`${channelId}:`) && platformThreadId.length > channelId.length + 1;
}
