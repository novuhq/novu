import type { PinoLogger } from '@novu/application-generic';
import type { HumanInteractionDelivery, HumanInteractionEntity } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import type { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { ReplyContentDto } from '../shared/dtos/agent-reply-payload.dto';
import { buildOutcomeReply } from './human-card.builder';

/**
 * Fail-soft in-place edit of every delivered card for a settled interaction (on WhatsApp, which can't edit, a reply
 * with the outcome instead) —
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
      // WhatsApp can't edit a sent message: the person is told the outcome of their tap in a reply instead.
      if (delivery.platform === HumanChannelViaEnum.WHATSAPP) {
        await replyWithOutcome(outboundGateway, interaction, delivery);
        continue;
      }

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

/** The outcome of an answer on WhatsApp, as a message of its own to the person who gave it. */
async function replyWithOutcome(
  outboundGateway: OutboundGateway,
  interaction: HumanInteractionEntity,
  delivery: HumanInteractionDelivery
): Promise<void> {
  const outcome = buildOutcomeReply(interaction);
  // Their wa_id is the last part of the thread id, `whatsapp:{phoneNumberId}:{waId}`.
  const waId = delivery.platformThreadId?.split(':').pop();
  if (!outcome || !waId) {
    return;
  }

  await outboundGateway.sendDirectMessage(interaction._agentId, delivery.integrationIdentifier, waId, {
    markdown: outcome,
  } as ReplyContentDto);
}
