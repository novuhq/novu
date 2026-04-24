import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

/** Picked integration fields embedded on an agent–integration link response. */
export class AgentIntegrationResponseIntegrationDto {
  @ApiProperty({ description: 'Integration document _id.' })
  _id: string;

  @ApiProperty({
    description: 'The integration identifier (matches the integration store), not the internal MongoDB _id.',
  })
  identifier: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ enum: ChannelTypeEnum, enumName: 'ChannelTypeEnum' })
  channel: ChannelTypeEnum;

  @ApiProperty()
  active: boolean;
}

export class AgentIntegrationResponseDto {
  @ApiProperty({ description: 'Agent–integration link document id.' })
  _id: string;

  @ApiProperty()
  _agentId: string;

  @ApiProperty({ type: AgentIntegrationResponseIntegrationDto })
  integration: AgentIntegrationResponseIntegrationDto;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiPropertyOptional({
    description: 'Set when the agent–integration link has been used (e.g. first credential resolution).',
  })
  connectedAt?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
