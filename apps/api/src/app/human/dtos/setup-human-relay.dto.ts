import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HumanChannelViaEnum } from '@novu/shared';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SetupHumanRelayRequestDto {
  @ApiPropertyOptional({
    description:
      'subscriberId that identifies the human being set up. Required unless `operator` is set; for the operator ' +
      'it is only a suggestion, used when the account has no operator yet.',
  })
  @ValidateIf((body: SetupHumanRelayRequestDto) => !body.operator || body.subscriberId !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  subscriberId?: string;

  @ApiPropertyOptional({
    description:
      'Set up the account owner themselves. The response carries the operator’s subscriberId: the one already ' +
      'recorded for the relay agent, otherwise the one passed here, otherwise a new one.',
  })
  @IsOptional()
  @IsBoolean()
  operator?: boolean;

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
}

export class SetupHumanRelayResponseDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty()
  agentIdentifier: string;

  @ApiProperty()
  subscriberId: string;
}

export class HumanOperatorResponseDto {
  @ApiPropertyOptional({ description: 'subscriberId of the account owner’s contact. Missing before any setup.' })
  subscriberId?: string;
}
