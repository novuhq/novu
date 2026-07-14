import type { PinoLogger } from '@novu/application-generic';
import type { ConversationEntity } from '@novu/dal';
import type { Thread } from 'chat';
import { buildUnresolvedSubscriberAccessReply } from '../../shared/util/agent-inbound-replies';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';

interface ThreadReplyPersistChannel {
  platformThreadId?: string;
  platform?: string;
  _integrationId?: string;
}

/**
 * Shared access-denied / transient / verification-failed reply used by the
 * inbound handler gate and the managed-runtime residual `!subscriber` path.
 */
export async function postUnresolvedSubscriberAccessReply(params: {
  turn: ConversationTurn;
  logger: Pick<PinoLogger, 'warn'>;
  replyOnThread: (
    thread: Thread,
    msg: { markdown: string },
    opts: {
      persist: {
        conversationId: string;
        channel: ThreadReplyPersistChannel;
        agentIdentifier: string;
        content: string;
        environmentId: string;
        organizationId: string;
      };
    }
  ) => Promise<unknown>;
  getPrimaryChannel: (conversation: ConversationEntity) => ThreadReplyPersistChannel;
  emailSenderUnverified?: boolean;
}): Promise<void> {
  const { turn, logger, replyOnThread, getPrimaryChannel, emailSenderUnverified } = params;
  const resolution = turn.subscriberResolution;

  logger.warn(
    {
      agentId: turn.agentId,
      environmentId: turn.config.environmentId,
      organizationId: turn.config.organizationId,
      platform: turn.config.platform,
      integrationIdentifier: turn.config.integrationIdentifier,
      conversationId: turn.conversation._id,
      senderPlatformUserId: turn.message?.author?.userId,
      resolutionOutcome: resolution?.outcome,
      resolvedSubscriberId: resolution?.outcome === 'resolved' ? resolution.subscriberId : undefined,
      err: resolution?.outcome === 'error' ? resolution.err : undefined,
      emailSenderUnverified: emailSenderUnverified === true ? true : undefined,
    },
    'Unresolved subscriber — replying with access message instead of dispatching'
  );

  const reply = buildUnresolvedSubscriberAccessReply({
    platform: turn.config.platform,
    senderEmail: turn.message?.author?.userId,
    resolutionOutcome: resolution?.outcome,
    emailSenderUnverified,
  });

  applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
  await replyOnThread(
    turn.thread,
    { markdown: reply },
    {
      persist: {
        conversationId: turn.conversation._id,
        channel: getPrimaryChannel(turn.conversation),
        agentIdentifier: turn.config.agentIdentifier,
        content: reply,
        environmentId: turn.config.environmentId,
        organizationId: turn.config.organizationId,
      },
    }
  );
}
