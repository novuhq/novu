import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanChannelViaEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const DEFAULT_CONTACTS_LIMIT = 50;
export const MAX_CONTACTS_LIMIT = 100;

export class ListContactsQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_CONTACTS_LIMIT, maximum: MAX_CONTACTS_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONTACTS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor from a previous page’s `next` — returns contacts after it.' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Relay agent whose channels, defaults and invites are reported. Defaults to `human-relay`.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/i)
  @MaxLength(64)
  agentIdentifier?: string;
}

export const HUMAN_CONTACT_STATUSES = ['joined', 'invite_sent'] as const;

/** `joined` once the agent can reach the contact on at least one channel; `invite_sent` until then. */
export type HumanContactStatus = (typeof HUMAN_CONTACT_STATUSES)[number];

export class HumanContactChannelDto {
  @ApiProperty({ enum: HumanChannelViaEnum })
  via: HumanChannelViaEnum;

  @ApiPropertyOptional({
    description: 'How the contact is known on the channel, when Human knows it: the email address or `@username`.',
  })
  handle?: string;

  @ApiPropertyOptional({ description: 'ISO timestamp when the contact connected the channel. Absent for email.' })
  connectedAt?: string;

  @ApiProperty({ description: 'Whether this is the channel used when an interaction doesn’t pass `via`.' })
  isDefault: boolean;
}

export class HumanContactInviteDto {
  @ApiProperty({ description: 'Invite page the contact opens to pick how the agent reaches them.' })
  url: string;

  @ApiProperty({ description: 'ISO timestamp when the link stops working.' })
  expiresAt: string;
}

/**
 * A contact is a subscriber, viewed as "someone an agent can talk to".
 * Only the human-facing subset of the subscriber is exposed — internal ids,
 * legacy `channels`, and topic membership stay out of the contract.
 */
export class HumanContactDto {
  @ApiProperty({ description: 'The subscriberId — pass it to `--to`.' })
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
    description: 'Free-form custom data on the subscriber (e.g. role notes).',
    type: 'object',
    additionalProperties: true,
  })
  data?: Record<string, unknown>;

  @ApiProperty({ type: [HumanContactChannelDto], description: 'Channels the agent can reach the contact on.' })
  channels: HumanContactChannelDto[];

  @ApiPropertyOptional({
    enum: HumanChannelViaEnum,
    description: 'Channel used when an interaction doesn’t pass `via`. Absent until a channel is connected.',
  })
  defaultVia?: HumanChannelViaEnum;

  @ApiProperty({ enum: HUMAN_CONTACT_STATUSES })
  status: HumanContactStatus;

  @ApiPropertyOptional({
    type: HumanContactInviteDto,
    description: 'The newest invite link that still works. Absent when none was sent, or it expired or was declined.',
  })
  invite?: HumanContactInviteDto;

  @ApiProperty({ description: 'When the contact was added.' })
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ListContactsResponseDto {
  @ApiProperty({ type: [HumanContactDto] })
  data: HumanContactDto[];

  @ApiProperty({ nullable: true, description: 'Cursor for the next page, or null when this is the last page.' })
  next: string | null;
}

export class RemoveContactResponseDto {
  @ApiProperty({ description: 'The subscriberId of the removed contact.' })
  id: string;

  @ApiProperty({ description: 'How many open interactions to the contact were canceled.' })
  canceledInteractions: number;
}
