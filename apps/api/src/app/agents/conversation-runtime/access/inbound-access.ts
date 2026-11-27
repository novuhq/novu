import type { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { isSubscriberTokensEnabled } from '../../../shared/utils/assert-subscriber-tokens-enabled';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { SubscriberResolution } from '../../shared/types/subscriber-resolution';
import { evaluateAgentAccessRule } from '../../shared/util/agent-access-rule';
import {
  SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../../shared/util/agent-inbound-replies';
import type { AgentConversationService } from '../conversation/agent-conversation.service';
import type { OutboundGateway } from '../egress/outbound.gateway';
import { postUnresolvedSubscriberAccessReply } from '../reply/post-unresolved-subscriber-access-reply';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';

export type InboundRefusal = { kind: 'unresolved' } | { kind: 'denied' } | { kind: 'error'; reason: string };

export type InboundAccess =
  | { verdict: 'admit' }
  /** A managed open-access leftover with no subscriber: no reply and no dispatch. */
  | { verdict: 'drop' }
  | { verdict: 'refuse'; refusal: InboundRefusal };

export type InboundSender = Pick<
  ConversationTurn,
  'subscriber' | 'context' | 'bridgeUrlOverride' | 'contextLookupFailed'
>;

export async function decideInboundAccess(
  input: {
    event: AgentEventEnum;
    config: ResolvedAgentConfig;
    resolution: SubscriberResolution | undefined;
    sender: InboundSender;
    emailSenderUnverified: boolean;
  },
  featureFlagsService: Pick<FeatureFlagsService, 'getFlag'>
): Promise<InboundAccess> {
  const { config, resolution } = input;

  if (config.subscriberAccess === AgentSubscriberAccessEnum.RULE) {
    const refusal = await findRuleRefusal(input, featureFlagsService);

    return refusal ? { verdict: 'refuse', refusal } : { verdict: 'admit' };
  }

  const isKeylessEmailDemo = config.isKeyless && config.platform === AgentPlatformEnum.EMAIL;
  if (isKeylessEmailDemo || !resolution || resolution.outcome === 'resolved') {
    return { verdict: 'admit' };
  }

  if (
    config.subscriberAccess === AgentSubscriberAccessEnum.OPEN &&
    resolution.outcome === 'not_found' &&
    !input.emailSenderUnverified
  ) {
    // A managed runtime needs a subscriber, and a denial in a shared group would only be noise.
    return config.isManaged ? { verdict: 'drop' } : { verdict: 'admit' };
  }

  return { verdict: 'refuse', refusal: { kind: 'unresolved' } };
}

async function findRuleRefusal(
  input: Parameters<typeof decideInboundAccess>[0],
  featureFlagsService: Pick<FeatureFlagsService, 'getFlag'>
): Promise<InboundRefusal | null> {
  const { config, resolution, sender } = input;
  const tokensEnabled = await isSubscriberTokensEnabled({
    featureFlagsService,
    organizationId: config.organizationId,
    environmentId: config.environmentId,
  });
  if (!tokensEnabled) {
    return { kind: 'error', reason: 'subscriber tokens disabled' };
  }

  if (resolution && resolution.outcome !== 'resolved') {
    return { kind: 'unresolved' };
  }

  if (sender.contextLookupFailed) {
    return { kind: 'error', reason: 'context lookup failed' };
  }

  if (!sender.subscriber) {
    return { kind: 'error', reason: 'subscriber missing' };
  }

  const verdict = evaluateAgentAccessRule(config.accessRule, {
    subscriber: sender.subscriber,
    context: sender.context,
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

/** Replies to a refused message, edit or click. A refused reaction or delete stays silent, and so does a silent caller. */
export async function replyToRefusal(
  turn: ConversationTurn,
  refusal: InboundRefusal,
  deps: {
    logger: Pick<PinoLogger, 'warn'>;
    outboundGateway: Pick<OutboundGateway, 'replyOnThread'>;
    conversationService: Pick<AgentConversationService, 'getPrimaryChannel'>;
    emailSenderUnverified: boolean;
    silent?: boolean;
  }
): Promise<void> {
  if (deps.silent || !refusalSpeaks(turn.event)) {
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
