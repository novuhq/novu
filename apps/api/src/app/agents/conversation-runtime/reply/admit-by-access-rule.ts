import type { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { isSubscriberTokensEnabled } from '../../shared/assert-subscriber-tokens-enabled';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { evaluateAgentAccessRule } from '../../shared/util/agent-access-rule';
import {
  SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../../shared/util/agent-inbound-replies';
import type { AgentConversationService } from '../conversation/agent-conversation.service';
import type { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';
import { postUnresolvedSubscriberAccessReply } from './post-unresolved-subscriber-access-reply';

export type AccessRuleRefusal = { kind: 'unresolved' } | { kind: 'denied' } | { kind: 'error'; reason: string };

export type AccessRuleAdmission = { admitted: true } | { admitted: false; refusal: AccessRuleRefusal };

export async function admitByAccessRule(
  turn: ConversationTurn,
  deps: { logger: Pick<PinoLogger, 'warn'>; featureFlagsService: Pick<FeatureFlagsService, 'getFlag'> }
): Promise<AccessRuleAdmission> {
  if (turn.config.subscriberAccess !== AgentSubscriberAccessEnum.RULE) {
    return { admitted: true };
  }

  const refusal = await findRefusal(turn, deps.featureFlagsService);
  if (!refusal) {
    return { admitted: true };
  }

  deps.logger.warn(
    {
      agentId: turn.agentId,
      environmentId: turn.config.environmentId,
      platform: turn.config.platform,
      conversationId: turn.conversation._id,
      event: turn.event,
      subscriberId: turn.subscriber?.subscriberId,
      refusal: refusal.kind,
      ...(refusal.kind === 'error' ? { reason: refusal.reason } : {}),
    },
    'Agent access rule refused inbound event'
  );

  return { admitted: false, refusal };
}

async function findRefusal(
  turn: ConversationTurn,
  featureFlagsService: Pick<FeatureFlagsService, 'getFlag'>
): Promise<AccessRuleRefusal | null> {
  const tokensEnabled = await isSubscriberTokensEnabled({
    featureFlagsService,
    organizationId: turn.config.organizationId,
    environmentId: turn.config.environmentId,
  });
  if (!tokensEnabled) {
    return { kind: 'error', reason: 'subscriber tokens disabled' };
  }

  if (turn.subscriberResolution && turn.subscriberResolution.outcome !== 'resolved') {
    return { kind: 'unresolved' };
  }

  if (turn.contextLookupFailed) {
    return { kind: 'error', reason: 'context lookup failed' };
  }

  if (!turn.subscriber) {
    return { kind: 'error', reason: 'subscriber missing' };
  }

  const verdict = evaluateAgentAccessRule(turn.config.accessRule, {
    subscriber: turn.subscriber,
    context: turn.context,
  });

  switch (verdict.outcome) {
    case 'allowed':
      return null;
    case 'denied':
      return { kind: 'denied' };
    case 'error':
      return { kind: 'error', reason: verdict.reason };
  }
}

/** Replies to a refused message, edit or click. A refused reaction or delete stays silent. */
export async function postAccessRuleRefusal(
  turn: ConversationTurn,
  refusal: AccessRuleRefusal,
  deps: {
    logger: Pick<PinoLogger, 'warn'>;
    outboundGateway: Pick<OutboundGateway, 'replyOnThread'>;
    conversationService: Pick<AgentConversationService, 'getPrimaryChannel'>;
    emailSenderUnverified?: boolean;
  }
): Promise<void> {
  if (!refusalSpeaks(turn.event)) {
    return;
  }

  const replyOnThread: Parameters<typeof postUnresolvedSubscriberAccessReply>[0]['replyOnThread'] = (
    thread,
    msg,
    opts
  ) => deps.outboundGateway.replyOnThread(thread, msg, opts);

  if (refusal.kind === 'unresolved') {
    await postUnresolvedSubscriberAccessReply({
      turn,
      logger: deps.logger,
      replyOnThread,
      getPrimaryChannel: (conversation) => deps.conversationService.getPrimaryChannel(conversation),
      emailSenderUnverified: deps.emailSenderUnverified,
    });

    return;
  }

  const reply =
    refusal.kind === 'denied' ? SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY : UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY;

  applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
  await replyOnThread(
    turn.thread,
    { markdown: reply },
    {
      persist: {
        conversationId: turn.conversation._id,
        channel: deps.conversationService.getPrimaryChannel(turn.conversation),
        agentIdentifier: turn.config.agentIdentifier,
        content: reply,
        environmentId: turn.config.environmentId,
        organizationId: turn.config.organizationId,
      },
    }
  );
}

function refusalSpeaks(event: AgentEventEnum): boolean {
  switch (event) {
    case AgentEventEnum.ON_MESSAGE:
    case AgentEventEnum.ON_MESSAGE_UPDATED:
    case AgentEventEnum.ON_ACTION:
      return true;
    case AgentEventEnum.ON_MESSAGE_DELETED:
    case AgentEventEnum.ON_REACTION:
    case AgentEventEnum.ON_RESOLVE:
    case AgentEventEnum.ON_ABORT:
      return false;
    default: {
      const exhaustiveCheck: never = event;

      return exhaustiveCheck;
    }
  }
}
