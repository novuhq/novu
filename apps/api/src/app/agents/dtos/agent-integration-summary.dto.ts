import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

export class AgentIntegrationSummaryDto {
  @ApiProperty({ description: 'Integration document id.' })
  integrationId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiPropertyOptional({
    description: 'Delivery channel; not set for agent-runtime integrations.',
    enum: ChannelTypeEnum,
    enumName: 'ChannelTypeEnum',
  })
  channel?: ChannelTypeEnum;

  @ApiProperty()
  active: boolean;
}
