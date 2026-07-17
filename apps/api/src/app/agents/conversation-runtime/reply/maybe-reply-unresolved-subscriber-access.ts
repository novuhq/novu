import type { PinoLogger } from '@novu/application-generic';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { AgentConversationService } from '../conversation/agent-conversation.service';
import type { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { postUnresolvedSubscriberAccessReply } from './post-unresolved-subscriber-access-reply';

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

  if (turn.event !== AgentEventEnum.ON_MESSAGE) {
    return false;
  }

  // Keyless email demos stay ungated; keyless non-email still hits this gate.
  const isKeylessEmailDemo = turn.config.isKeyless && turn.config.platform === AgentPlatformEnum.EMAIL;
  if (isKeylessEmailDemo) {
    return false;
  }

  const resolution = turn.subscriberResolution;
  if (!resolution || resolution.outcome === 'resolved') {
    return false;
  }

  // Open + not_found (verified): custom-code Pass null to the bridge; managed
  // leftovers (e.g. Telegram group) skip silently — no denial spam into groups,
  // and managed dispatch requires a subscriber anyway.
  if (
    turn.config.subscriberAccess === AgentSubscriberAccessEnum.OPEN &&
    resolution.outcome === 'not_found' &&
    !emailSenderUnverified
  ) {
    if (!turn.config.isManaged) {
      return false;
    }

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
  }

  // Restricted custom-code (bridge) agents delegate the unlinked-sender gate to the
  // framework, which posts the auth CTA card (and arms the "account linked" edit)
  // once the turn reaches the bridge. Managed agents have no such card, and
  // error/invalid_identity/email-unverified stay on the plain reply below.
  if (
    !turn.config.isManaged &&
    turn.config.subscriberAccess === AgentSubscriberAccessEnum.RESTRICTED &&
    resolution.outcome === 'not_found' &&
    !emailSenderUnverified
  ) {
    return false;
  }

  await postUnresolvedSubscriberAccessReply({
    turn,
    logger,
    replyOnThread: (thread, msg, opts) => outboundGateway.replyOnThread(thread, msg, opts),
    getPrimaryChannel: (conversation) => conversationService.getPrimaryChannel(conversation),
    emailSenderUnverified,
  });

  return true;
}
