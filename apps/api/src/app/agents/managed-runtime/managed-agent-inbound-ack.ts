import type { Message, Thread } from 'chat';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { PLATFORMS_WITH_TYPING_INDICATOR } from '../shared/enums/agent-platform.enum';

const ACKNOWLEDGE_FALLBACK_EMOJI = 'eyes' as const;

export async function showManagedInboundAck(params: {
  outboundGateway: OutboundGateway;
  agentId: string;
  config: ResolvedAgentConfig;
  platformThreadId: string | undefined;
  thread?: Thread;
  message: Message | null;
  isFirstMessage: boolean;
}): Promise<void> {
  const { outboundGateway, agentId, config, platformThreadId, thread, message, isFirstMessage } = params;

  if (!config.acknowledgeOnReceived) {
    return;
  }

  if (PLATFORMS_WITH_TYPING_INDICATOR.has(config.platform)) {
    if (!platformThreadId) {
      return;
    }

    await outboundGateway.startTypingInConversation(agentId, config.integrationIdentifier, platformThreadId);

    return;
  }

  if (!isFirstMessage || !message?.id || !thread) {
    return;
  }

  await thread.createSentMessageFromMessage(message).addReaction(ACKNOWLEDGE_FALLBACK_EMOJI);
}
