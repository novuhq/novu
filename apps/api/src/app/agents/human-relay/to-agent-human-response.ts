import type { HumanInteractionEntity } from '@novu/dal';
import type { AgentHumanResponse } from '@novu/framework';
import { HumanInteractionStatusEnum } from '@novu/shared';

export function toAgentHumanResponse(interaction: HumanInteractionEntity): AgentHumanResponse {
  return {
    requestId: interaction.requestId ?? interaction.identifier,
    interactionId: interaction.identifier,
    kind: interaction.kind,
    status: interaction.status,
    expired: interaction.status === HumanInteractionStatusEnum.EXPIRED,
    text: interaction.response?.text,
    optionId: interaction.response?.optionId,
    respondedBy: interaction.response?.respondedBy,
    respondedBySubscriberId: interaction.response?.respondedBySubscriberId,
  };
}
