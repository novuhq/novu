import type { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { isSubscriberTokensEnabled } from '../../shared/assert-subscriber-tokens-enabled';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { type AgentAccessRuleVerdict, evaluateAgentAccessRule } from '../../shared/util/agent-access-rule';
import type { AgentConversationService } from '../conversation/agent-conversation.service';
import type { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { postUnresolvedSubscriberAccessReply } from './post-unresolved-subscriber-access-reply';

export type AccessRuleAdmission = { admitted: true } | { admitted: false; refuse: () => Promise<void> };

type AdmitParams = {
  turn: ConversationTurn;
  logger: Pick<PinoLogger, 'warn'>;
  outboundGateway: Pick<OutboundGateway, 'replyOnThread'>;
  conversationService: Pick<AgentConversationService, 'getPrimaryChannel'>;
  featureFlagsService: Pick<FeatureFlagsService, 'getFlag'>;
  emailSenderUnverified?: boolean;
};

export async function admitByAccessRule(params: AdmitParams): Promise<AccessRuleAdmission> {
  const { turn } = params;

  if (turn.config.subscriberAccess !== AgentSubscriberAccessEnum.RULE) {
    return { admitted: true };
  }

  const isKeylessEmailDemo = turn.config.isKeyless && turn.config.platform === AgentPlatformEnum.EMAIL;
  if (isKeylessEmailDemo) {
    return { admitted: true };
  }

  const tokensEnabled = await isSubscriberTokensEnabled({
    featureFlagsService: params.featureFlagsService,
    organizationId: turn.config.organizationId,
    environmentId: turn.config.environmentId,
  });

  if (!tokensEnabled) {
    return refuseAdmission(params, true, { outcome: 'error', reason: 'subscriber tokens disabled' });
  }

  const resolution = turn.subscriberResolution;
  if (resolution && resolution.outcome !== 'resolved') {
    return refuseAdmission(params, false);
  }

  if (turn.contextLookupFailed) {
    return refuseAdmission(params, true, { outcome: 'error', reason: 'context lookup failed' });
  }

  const subscriber = turn.subscriber;
  const verdict: AgentAccessRuleVerdict = subscriber
    ? evaluateAgentAccessRule(turn.config.accessRule, { subscriber, context: turn.context })
    : { outcome: 'error', reason: 'subscriber missing' };

  if (verdict.outcome === 'allowed') {
    return { admitted: true };
  }

  return refuseAdmission(params, true, verdict);
}

function refuseAdmission(
  params: AdmitParams,
  accessRuleRefused: boolean,
  verdict?: AgentAccessRuleVerdict
): AccessRuleAdmission {
  const { turn, logger } = params;

  if (verdict) {
    logger.warn(
      {
        agentId: turn.agentId,
        environmentId: turn.config.environmentId,
        platform: turn.config.platform,
        conversationId: turn.conversation._id,
        event: turn.event,
        subscriberId: turn.subscriber?.subscriberId,
        outcome: verdict.outcome,
        ...(verdict.outcome === 'error' ? { reason: verdict.reason } : {}),
      },
      'Agent access rule refused inbound event'
    );
  }

  return {
    admitted: false,
    refuse: async () => postRuleRefusal(params, accessRuleRefused),
  };
}

async function postRuleRefusal(params: AdmitParams, accessRuleRefused: boolean): Promise<void> {
  if (!accessRuleRefusalSpeaks(params.turn.event)) {
    return;
  }

  const { turn, logger, outboundGateway, conversationService, emailSenderUnverified } = params;

  await postUnresolvedSubscriberAccessReply({
    turn,
    logger,
    replyOnThread: (thread, msg, opts) => outboundGateway.replyOnThread(thread, msg, opts),
    getPrimaryChannel: (conversation) => conversationService.getPrimaryChannel(conversation),
    emailSenderUnverified,
    accessRuleRefused,
  });
}

function accessRuleRefusalSpeaks(event: AgentEventEnum): boolean {
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
