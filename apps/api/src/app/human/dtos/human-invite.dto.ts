import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanAddressVerificationStateEnum, HumanChannelViaEnum } from '@novu/shared';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import type { HumanInviteVia } from '../services/human-delivery.service';

const INVITE_VIAS: HumanInviteVia[] = [
  HumanChannelViaEnum.TELEGRAM,
  HumanChannelViaEnum.SLACK,
  HumanChannelViaEnum.EMAIL,
];

export const HUMAN_INVITE_APP_NAMES: Record<HumanInviteVia, string> = {
  [HumanChannelViaEnum.TELEGRAM]: 'Telegram',
  [HumanChannelViaEnum.SLACK]: 'Slack',
  [HumanChannelViaEnum.EMAIL]: 'Email',
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

  @ApiProperty({ description: 'Whether the human is already connected / verified on this channel.' })
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

/** Connect action — email requires an address for double opt-in. */
export class HumanInviteConnectRequestDto extends HumanInviteTokenRequestDto {
  @ApiProperty({ enum: INVITE_VIAS })
  @IsIn(INVITE_VIAS)
  via: HumanInviteVia;

  @ApiPropertyOptional({ description: 'Required when `via` is `email`.' })
  @ValidateIf((body: HumanInviteConnectRequestDto) => body.via === HumanChannelViaEnum.EMAIL)
  @IsEmail()
  @IsNotEmpty()
  address?: string;
}

export class RequestAddressVerificationDto {
  @ApiProperty({ description: 'subscriberId of the human being verified.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subscriberId: string;

  @ApiProperty({ enum: [HumanChannelViaEnum.EMAIL] })
  @IsIn([HumanChannelViaEnum.EMAIL])
  via: HumanChannelViaEnum.EMAIL;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Relay agent identifier. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/i)
  @MaxLength(64)
  agentIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;
}

export class RequestAddressVerificationResponseDto {
  @ApiProperty({ description: 'Masked address the verification was sent to.' })
  address: string;

  @ApiProperty({
    description:
      'Identifies this request. Once the link is used, the contact’s email channel reports it as `verifiedRequestedAt`.',
  })
  requestedAt: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty({ description: 'Seconds until another verification email may be sent.' })
  retryAfterSeconds: number;

  @ApiProperty({
    description: 'True when a different address is already verified and stays deliverable until this one is confirmed.',
  })
  replacesVerifiedAddress: boolean;
}

export class VerifyAddressRequestDto {
  @ApiProperty({ description: 'Verification token from the email link.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyAddressResponseDto {
  @ApiProperty()
  verified: true;

  @ApiPropertyOptional({ description: "The agent's own name; absent while it still has the placeholder name." })
  agentName?: string;

  @ApiPropertyOptional({ description: 'Person who owns the relay, when they set a name during `human setup`.' })
  operatorName?: string;

  @ApiProperty({ enum: HumanChannelViaEnum })
  via: HumanChannelViaEnum;

  @ApiProperty({ description: 'Masked verified address.' })
  address: string;
}

export type HumanInviteStatusChannel = {
  via: HumanInviteVia;
  connected: boolean;
  isDefault: boolean;
  status: HumanAddressVerificationStateEnum;
  address?: string;
};

export type HumanInviteStatusResult =
  | {
      valid: true;
      /** The agent's own name; absent while it still has the placeholder name. */
      agentName?: string;
      /** Person who owns the relay, when they set a name during `human setup`. */
      operatorName?: string;
      /** Display name, falling back to the subscriberId. */
      inviteeName: string;
      expiresAt: string;
      channels: HumanInviteStatusChannel[];
    }
  | { valid: false; reason: 'expired' | 'declined' | 'invalid' };
