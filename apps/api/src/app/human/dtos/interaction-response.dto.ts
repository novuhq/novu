import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { HumanInteractionEntity } from '@novu/dal';
import {
  HumanInteractionKindEnum,
  HumanInteractionOption,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
} from '@novu/shared';

export class InteractionResponseDto {
  @ApiProperty({ description: 'Public interaction id (`hi_...`).' })
  id: string;

  @ApiProperty({ enum: HumanInteractionKindEnum })
  kind: HumanInteractionKindEnum;

  @ApiProperty({ enum: HumanInteractionStatusEnum })
  status: HumanInteractionStatusEnum;

  @ApiProperty()
  prompt: string;

  @ApiPropertyOptional()
  options?: HumanInteractionOption[];

  @ApiPropertyOptional({ description: 'Attribution label of the calling agent.' })
  from?: string;

  @ApiProperty({ description: 'subscriberId of the addressed human.' })
  to: string;

  @ApiProperty()
  integrationIdentifier: string;

  @ApiProperty()
  platform: string;

  @ApiPropertyOptional({ description: 'Present once the interaction reached a terminal, answered state.' })
  response?: HumanInteractionResponse;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty()
  createdAt: string;
}

export function toInteractionResponse(entity: HumanInteractionEntity): InteractionResponseDto {
  return {
    id: entity.identifier,
    kind: entity.kind,
    status: entity.status,
    prompt: entity.prompt,
    options: entity.options,
    from: entity.fromLabel,
    to: entity.subscriberId,
    integrationIdentifier: entity.integrationIdentifier,
    platform: entity.platform,
    response: entity.response,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
  };
}
