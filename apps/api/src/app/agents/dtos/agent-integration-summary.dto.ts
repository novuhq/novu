import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ enum: ChannelTypeEnum, enumName: 'ChannelTypeEnum' })
  channel: ChannelTypeEnum;

  @ApiProperty()
  active: boolean;
}
