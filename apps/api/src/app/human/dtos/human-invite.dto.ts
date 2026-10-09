import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { HumanInviteVia } from '../services/human-delivery.service';

const INVITE_VIAS: HumanInviteVia[] = [HumanChannelViaEnum.TELEGRAM, HumanChannelViaEnum.SLACK];

export const HUMAN_INVITE_APP_NAMES: Record<HumanInviteVia, string> = {
  [HumanChannelViaEnum.TELEGRAM]: 'Telegram',
  [HumanChannelViaEnum.SLACK]: 'Slack',
};

export class CreateHumanInviteRequestDto {
  @ApiProperty({ description: 'subscriberId of the human being invited.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subscriberId: string;

  @ApiPropertyOptional({ description: 'Relay agent identifier. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/i)
  @MaxLength(64)
  agentIdentifier?: string;

  @ApiPropertyOptional({ description: 'The human’s first name, shown on the invite page.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @ApiPropertyOptional({ description: 'The human’s last name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;
}

export class HumanInviteChannelDto {
  @ApiProperty({ enum: INVITE_VIAS })
  via: HumanInviteVia;

  @ApiProperty()
  integrationIdentifier: string;

  @ApiProperty({ description: 'Whether the human is already connected on this channel.' })
  connected: boolean;
}

export class CreateHumanInviteResponseDto {
  @ApiProperty({ description: 'Invite page the human opens to pick how the agent reaches them.' })
  url: string;

  @ApiProperty({ description: 'ISO timestamp when the link stops working.' })
  expiresAt: string;

  @ApiProperty({ type: [HumanInviteChannelDto], description: 'Apps offered on the invite page.' })
  channels: HumanInviteChannelDto[];
}

export class HumanInviteTokenRequestDto {
  @ApiProperty({ description: 'Invite token from the invite page URL.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class HumanInviteChannelRequestDto extends HumanInviteTokenRequestDto {
  @ApiProperty({ enum: INVITE_VIAS })
  @IsIn(INVITE_VIAS)
  via: HumanInviteVia;
}

export type HumanInviteStatusResult =
  | {
      valid: true;
      agentName: string;
      /** The account owner's name. Missing when they haven't given one. */
      inviterName?: string;
      /** Display name, falling back to the subscriberId. */
      inviteeName: string;
      expiresAt: string;
      channels: Array<{ via: HumanInviteVia; connected: boolean; isDefault: boolean }>;
    }
  | { valid: false; reason: 'expired' | 'declined' | 'invalid' };
