import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanAddressVerificationStateEnum, HumanChannelViaEnum } from '@novu/shared';

/** How one channel can reach the contact. */
export class GetContactChannelDto {
  @ApiProperty({ enum: HumanChannelViaEnum })
  via: HumanChannelViaEnum;

  @ApiProperty({ enum: HumanAddressVerificationStateEnum })
  status: HumanAddressVerificationStateEnum;

  @ApiPropertyOptional({ description: 'Masked address for address-based channels, such as `a***@b.com`.' })
  address?: string;

  @ApiPropertyOptional()
  verifiedAt?: string;

  @ApiPropertyOptional({
    description: '`requestedAt` of the request that produced the verified slot. Lets a caller match its own request.',
  })
  verifiedRequestedAt?: string;

  @ApiPropertyOptional({ description: 'Set while a newer request is pending (the pending slot’s `requestedAt`).' })
  requestedAt?: string;

  @ApiPropertyOptional({
    description:
      'How the contact shows on a connected chat app: `@username` on Telegram (else their name), their name on Slack.',
  })
  handle?: string;

  @ApiPropertyOptional({ description: 'The Slack workspace the contact is in, such as `acme.slack.com`.' })
  workspace?: string;
}

/** One contact, with the channels the relay agent can reach them on. */
export class GetContactResponseDto {
  @ApiProperty({ description: 'The contact’s subscriberId.' })
  id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Free-form custom data on the subscriber.',
  })
  data?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [GetContactChannelDto] })
  channels: GetContactChannelDto[];
}
