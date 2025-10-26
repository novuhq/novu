import { ApiProperty } from '@nestjs/swagger';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import { AuthDto, WorkspaceDto } from './shared.dto';

export class GetChannelConnectionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel endpoint.',
    type: String,
  })
  identifier: string;

  @ApiProperty({
    description: 'The channel type (email, sms, push, chat, etc.).',
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum | null;

  @ApiProperty({
    description: 'The provider identifier (e.g., sendgrid, twilio, slack, etc.).',
    enum: Object.values(ProvidersIdEnumConst),
  })
  provider: ProvidersIdEnum | null;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel endpoint.',
    type: String,
    example: 'slack-prod',
  })
  integrationIdentifier: string | null;

  @ApiProperty({ type: WorkspaceDto })
  workspace: WorkspaceDto;

  @ApiProperty({ type: AuthDto })
  auth: AuthDto;

  @ApiProperty({
    description: 'The timestamp indicating when the channel endpoint was created, in ISO 8601 format.',
    type: String,
  })
  createdAt: string;

  @ApiProperty({
    description: 'The timestamp indicating when the channel endpoint was last updated, in ISO 8601 format.',
    type: String,
  })
  updatedAt: string;
}
