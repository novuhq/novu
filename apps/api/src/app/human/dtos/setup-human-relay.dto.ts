import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AGENT_NAME_MAX_LENGTH, HumanChannelViaEnum } from '@novu/shared';
import { Transform, type TransformFnParams } from 'class-transformer';
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

/** As long as a Telegram bot's description may be, the longest of the places it is shown. */
export const AGENT_DESCRIPTION_MAX_LENGTH = 512;

// Trim before measuring, so spaces around a valid value can't push it over the limit.
export const trimmed = ({ value }: TransformFnParams) => (typeof value === 'string' ? value.trim() : value);

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
    description:
      'What the relay agent is called, as people see it on the invite page, in emails and on its chat bots. ' +
      'Missing leaves the name it has; a new agent is called "Human".',
    maxLength: AGENT_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty()
  @MaxLength(AGENT_NAME_MAX_LENGTH)
  agentName?: string;

  @ApiPropertyOptional({
    description: 'A line about what the relay agent does, shown with its name. An empty one clears it.',
    maxLength: AGENT_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(AGENT_DESCRIPTION_MAX_LENGTH)
  agentDescription?: string;

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

  @ApiProperty({ description: 'What the relay agent is called.' })
  agentName: string;

  @ApiProperty()
  subscriberId: string;
}

export class HumanOperatorResponseDto {
  @ApiPropertyOptional({ description: 'subscriberId of the account owner’s contact. Missing before any setup.' })
  subscriberId?: string;
}
