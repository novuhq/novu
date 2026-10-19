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
    enum: [...new Set([...Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj))])],
    type: String,
    nullable: true,
    example: 'slack',
  })
  providerId: ProvidersIdEnum | null;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel endpoint.',
    type: String,
    example: 'slack-prod',
  })
  integrationIdentifier: string | null;

  @ApiProperty({
    description: 'The subscriber ID to which the channel connection is linked',
    type: String,
    example: 'subscriber-123',
  })
  subscriberId: string | null;

  @ApiProperty({
    description: 'The context of the channel connection',
    type: [String],
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  contextKeys: string[];

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
