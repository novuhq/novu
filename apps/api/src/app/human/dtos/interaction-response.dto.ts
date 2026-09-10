import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type HumanInteractionEntity, primaryHumanInteractionDelivery } from '@novu/dal';
import {
  type HumanInteractionContent,
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
  humanInteractionRecipientIds,
} from '@novu/shared';

export class InteractionResponseDto {
  @ApiProperty({ description: 'Public interaction id (`hi_...`).' })
  id: string;

  @ApiProperty({ enum: HumanInteractionKindEnum })
  kind: HumanInteractionKindEnum;

  @ApiProperty({ enum: HumanInteractionStatusEnum })
  status: HumanInteractionStatusEnum;

  @ApiProperty({ description: 'Markdown, chrome, or a posted chat card element.' })
  content: HumanInteractionContent;

  @ApiPropertyOptional({ description: 'Attribution label of the calling agent.' })
  from?: string;

  @ApiProperty({
    description: 'Novu subscriberIds allowed to settle this interaction. First valid answer wins.',
    type: [String],
  })
  to: string[];

  @ApiProperty()
  integrationIdentifier: string;

  @ApiProperty()
  platform: string;

  @ApiPropertyOptional({ description: 'Present once the interaction reached a terminal, answered state.' })
  response?: HumanInteractionResponse;

  @ApiPropertyOptional({
    description:
      'Recipients that did not receive a DM. Present only on create when fan-out was partial; the interaction is still live for everyone who did.',
    type: [String],
  })
  failedTo?: string[];

  @ApiProperty()
  expiresAt: string;

  @ApiProperty()
  createdAt: string;
}

export function toInteractionResponse(
  entity: HumanInteractionEntity,
  failedSubscriberIds?: string[]
): InteractionResponseDto {
  const primary = primaryHumanInteractionDelivery(entity);

  return {
    id: entity.identifier,
    kind: entity.kind,
    status: entity.status,
    content: entity.content,
    from: entity.fromLabel,
    to: humanInteractionRecipientIds(entity),
    integrationIdentifier: primary?.integrationIdentifier ?? '',
    platform: primary?.platform ?? '',
    response: entity.response,
    ...(failedSubscriberIds && failedSubscriberIds.length > 0 ? { failedTo: failedSubscriberIds } : {}),
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
  };
}
