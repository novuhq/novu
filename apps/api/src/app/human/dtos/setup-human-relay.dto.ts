import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanChannelViaEnum } from '@novu/shared';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SetupHumanRelayRequestDto {
  @ApiProperty({ description: 'subscriberId that identifies the human being set up.' })
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

  @ApiPropertyOptional({
    description: 'The human’s email address — required for the email channel (identity lives on the subscriber).',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'The human’s first name (display name shown to agents and in reply attribution).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @ApiPropertyOptional({ description: 'The human’s last name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;

  @ApiPropertyOptional({
    enum: HumanChannelViaEnum,
    description:
      'Channel the inviter picked (`human invite --via`). Becomes the human’s default unless they already chose one themselves.',
  })
  @IsOptional()
  @IsEnum(HumanChannelViaEnum)
  defaultVia?: HumanChannelViaEnum;

  @ApiPropertyOptional({
    description:
      'True when the caller is the relay’s owner (`human setup`). Their first/last name becomes the relay’s display name — what invitees see in verification emails and on the invite page.',
  })
  @IsOptional()
  @IsBoolean()
  operator?: boolean;
}

export class SetupHumanRelayResponseDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty()
  agentIdentifier: string;

  @ApiProperty()
  subscriberId: string;
}
