import type { PinoLogger } from '@novu/application-generic';
import type { HumanInteractionEntity } from '@novu/dal';
import type { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { ReplyContentDto } from '../shared/dtos/agent-reply-payload.dto';

/**
 * Fail-soft in-place edit of every delivered card for a settled interaction —
 * delivery problems must never undo a settlement. Shared by the settlement
 * service (generic HITL cards) and the tool-approval resume path (self-hosted
 * cards, which stay edited rather than deleted).
 */
export async function editDeliveredHumanCards(
  outboundGateway: OutboundGateway,
  logger: PinoLogger,
  interaction: HumanInteractionEntity,
  content: ReplyContentDto
): Promise<void> {
  for (const delivery of interaction.deliveries ?? []) {
    try {
      await outboundGateway.editInConversation(
        interaction._agentId,
        delivery.integrationIdentifier,
        delivery.platform,
        delivery.platformThreadId,
        delivery.platformMessageId,
        content
      );
    } catch (err) {
      logger.warn(
        {
          err,
          interactionIdentifier: interaction.identifier,
          platform: delivery.platform,
          platformMessageId: delivery.platformMessageId,
        },
        'Failed to edit delivered human-interaction message after settlement'
      );
    }
  }
}
