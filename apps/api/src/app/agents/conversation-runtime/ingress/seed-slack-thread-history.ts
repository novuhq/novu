import { PinoLogger } from '@novu/application-generic';
import { ConversationEntity } from '@novu/dal';
import type { Message, Thread } from 'chat';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { AGENT_HISTORY_LIMIT, AgentConversationService } from '../conversation/agent-conversation.service';
import type { WorkflowOriginSnapshot } from './workflow-origin.helpers';

export interface UnseenThreadMessage {
  senderName?: string;
  content: string;
}

export async function collectSlackThreadHistoryMessages(params: {
  thread: Thread;
  currentMessageId: string;
  originPlatformMessageId?: string;
  limit?: number;
}): Promise<Message[]> {
  const { thread, currentMessageId, originPlatformMessageId } = params;
  const limit = params.limit ?? AGENT_HISTORY_LIMIT;
  const messages = thread.messages;

  if (messages == null || typeof messages !== 'object' || !(Symbol.asyncIterator in messages)) {
    return [];
  }

  const newestFirst: Message[] = [];
  let reachedCurrentMessage = false;

  for await (const msg of messages) {
    if (msg?.id === currentMessageId) {
      reachedCurrentMessage = true;
      continue;
    }

    if (!reachedCurrentMessage) {
      continue;
    }

    if (originPlatformMessageId && msg.id === originPlatformMessageId) {
      continue;
    }

    if (!msg.id || !msg.author?.userId || !msg.text?.trim()) {
      continue;
    }

    newestFirst.push(msg);

    if (newestFirst.length >= limit) {
      break;
    }
  }

  return newestFirst.reverse();
}

export async function seedSlackThreadHistory(params: {
  agentId: string;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  thread: Thread;
  message: Message;
  platformThreadId: string;
  workflowOrigin?: WorkflowOriginSnapshot | null;
  conversationService: Pick<AgentConversationService, 'importInboundMessages'>;
  logger: Pick<PinoLogger, 'warn'>;
}): Promise<UnseenThreadMessage[]> {
  const { agentId, config, conversation, thread, message, platformThreadId, workflowOrigin } = params;

  if (config.platform !== AgentPlatformEnum.SLACK || thread.isDM || message.isMention !== true) {
    return [];
  }

  try {
    const prior = await collectSlackThreadHistoryMessages({
      thread,
      currentMessageId: message.id,
      originPlatformMessageId: workflowOrigin?.data.platformMessageId,
    });

    const imported = await params.conversationService.importInboundMessages({
      conversationId: conversation._id,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      messages: prior.map((msg) => ({
        senderId: `${config.platform}:${msg.author.userId}`,
        senderName: msg.author.fullName,
        content: msg.text,
        platformMessageId: msg.id,
        identifier: `slack_hist_${conversation._id}_${msg.id}`,
      })),
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });

    const importedIds = new Set(imported.map((entry) => entry.platformMessageId));

    return prior
      .filter((msg) => importedIds.has(msg.id) && msg.author.isBot !== true)
      .map((msg) => ({ senderName: msg.author.fullName, content: msg.text }));
  } catch (err) {
    params.logger.warn(err, `[agent:${agentId}] Failed to seed Slack thread history; continuing without it`);
    captureAgentWarning(err, {
      component: 'seed-slack-thread-history',
      operation: 'seed',
      agentId,
      extra: { conversationId: conversation._id, platformThreadId },
    });

    return [];
  }
}
