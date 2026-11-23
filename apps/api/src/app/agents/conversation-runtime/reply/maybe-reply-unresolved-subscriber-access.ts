import type { PinoLogger } from '@novu/application-generic';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { AgentConversationService } from '../conversation/agent-conversation.service';
import type { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { postUnresolvedSubscriberAccessReply } from './post-unresolved-subscriber-access-reply';

export type UnresolvedSubscriberAccess = 'admit' | 'drop' | 'refuse';

export function decideUnresolvedSubscriberAccess(
  turn: Pick<ConversationTurn, 'event' | 'config' | 'subscriberResolution'>,
  emailSenderUnverified: boolean
): UnresolvedSubscriberAccess {
  if (turn.event !== AgentEventEnum.ON_MESSAGE && turn.event !== AgentEventEnum.ON_MESSAGE_UPDATED) {
    return 'admit';
  }

  // Keyless email demos stay ungated; keyless non-email still hits this gate.
  const isKeylessEmailDemo = turn.config.isKeyless && turn.config.platform === AgentPlatformEnum.EMAIL;
  if (isKeylessEmailDemo) {
    return 'admit';
  }

  const resolution = turn.subscriberResolution;
  if (!resolution || resolution.outcome === 'resolved') {
    return 'admit';
  }

  // Open + not_found (verified): custom-code Pass null to the bridge; managed
  // leftovers (e.g. Telegram group) skip silently — no denial spam into groups,
  // and managed dispatch requires a subscriber anyway.
  if (
    turn.config.subscriberAccess === AgentSubscriberAccessEnum.OPEN &&
    resolution.outcome === 'not_found' &&
    !emailSenderUnverified
  ) {
    return turn.config.isManaged ? 'drop' : 'admit';
  }

  return 'refuse';
}

/**
 * Message-only subscriber-access gate shared by managed and custom-code.
 * Returns true when the turn was answered or intentionally dropped and must not dispatch.
 */
export async function maybeReplyUnresolvedSubscriberAccess(params: {
  turn: ConversationTurn;
  logger: Pick<PinoLogger, 'warn'>;
  outboundGateway: Pick<OutboundGateway, 'replyOnThread'>;
  conversationService: Pick<AgentConversationService, 'getPrimaryChannel'>;
  emailSenderUnverified: boolean;
}): Promise<boolean> {
  const { turn, logger, outboundGateway, conversationService, emailSenderUnverified } = params;

  switch (decideUnresolvedSubscriberAccess(turn, emailSenderUnverified)) {
    case 'admit':
      return false;

    case 'drop':
      logger.warn(
        {
          agentId: turn.agentId,
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
          platform: turn.config.platform,
          conversationId: turn.conversation._id,
          senderPlatformUserId: turn.message?.author?.userId,
        },
        'Managed open-access leftover without subscriber — skipping dispatch without denial reply'
      );

      return true;

    case 'refuse':
      await postUnresolvedSubscriberAccessReply({
        turn,
        logger,
        replyOnThread: (thread, msg, opts) => outboundGateway.replyOnThread(thread, msg, opts),
        getPrimaryChannel: (conversation) => conversationService.getPrimaryChannel(conversation),
        emailSenderUnverified,
      });

      return true;
  }
}
