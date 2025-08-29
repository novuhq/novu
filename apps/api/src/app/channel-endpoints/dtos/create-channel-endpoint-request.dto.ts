import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelEndpointRouting } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateChannelEndpointRequestDto {
  @ApiPropertyOptional({
    description:
      'The unique identifier for the channel endpoint. If not provided, one will be generated automatically.',
    type: String,
    example: 'slack-prod-user123-abc4',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel endpoint.',
    type: String,
    example: 'slack-prod',
  })
  @IsString()
  @IsDefined()
  integrationIdentifier: string;

  @ApiProperty({
    description: 'The endpoint address/destination (e.g., OAuth token, webhook URL, phone number).',
    type: String,
    // cspell:disable-next-line
    example: 'some-sample-secret-token',
  })
  @IsString()
  @IsDefined()
  endpoint: string;

  @ApiPropertyOptional({
    description: 'Routing configuration for the channel endpoint (e.g., Slack channel/user routing).',
    type: 'object',
    example: {
      type: 'slack',
      channelId: 'C1234567890',
      userId: 'U1234567890',
    },
  })
  @IsOptional()
  @IsObject()
  routing?: ChannelEndpointRouting;
}
