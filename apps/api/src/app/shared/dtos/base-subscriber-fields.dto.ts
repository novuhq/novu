import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PreferredHours,
  PreferredHoursChannelOverrides,
  PreferredHoursChannelPolicy,
  SubscriberCustomData,
} from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsLocale,
  IsObject,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const CHANNEL_POLICY_VALUES = ['respect', 'always'] as const satisfies readonly PreferredHoursChannelPolicy[];

export class PreferredHoursChannelOverridesDto implements PreferredHoursChannelOverrides {
  @ApiPropertyOptional({ enum: CHANNEL_POLICY_VALUES, description: 'In-app channel preferred-hours policy' })
  @IsOptional()
  @IsIn(CHANNEL_POLICY_VALUES)
  in_app?: PreferredHoursChannelPolicy;

  @ApiPropertyOptional({ enum: CHANNEL_POLICY_VALUES, description: 'Email channel preferred-hours policy' })
  @IsOptional()
  @IsIn(CHANNEL_POLICY_VALUES)
  email?: PreferredHoursChannelPolicy;

  @ApiPropertyOptional({ enum: CHANNEL_POLICY_VALUES, description: 'SMS channel preferred-hours policy' })
  @IsOptional()
  @IsIn(CHANNEL_POLICY_VALUES)
  sms?: PreferredHoursChannelPolicy;

  @ApiPropertyOptional({ enum: CHANNEL_POLICY_VALUES, description: 'Chat channel preferred-hours policy' })
  @IsOptional()
  @IsIn(CHANNEL_POLICY_VALUES)
  chat?: PreferredHoursChannelPolicy;

  @ApiPropertyOptional({ enum: CHANNEL_POLICY_VALUES, description: 'Push channel preferred-hours policy' })
  @IsOptional()
  @IsIn(CHANNEL_POLICY_VALUES)
  push?: PreferredHoursChannelPolicy;
}

export class PreferredHoursDto implements PreferredHours {
  @ApiPropertyOptional({
    description: 'Start of the preferred contact window in 24-hour HH:mm format',
    example: '09:00',
    type: String,
  })
  @IsString()
  @Matches(HH_MM_PATTERN, { message: 'preferredHours.start must be HH:mm (24-hour)' })
  start: string;

  @ApiPropertyOptional({
    description: 'End of the preferred contact window in 24-hour HH:mm format',
    example: '18:00',
    type: String,
  })
  @IsString()
  @Matches(HH_MM_PATTERN, { message: 'preferredHours.end must be HH:mm (24-hour)' })
  end: string;

  @ApiPropertyOptional({
    description:
      'Per-channel overrides. `always` lets that channel interrupt outside the window; unset channels default to `respect`.',
    type: PreferredHoursChannelOverridesDto,
    example: { sms: 'always', email: 'respect' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferredHoursChannelOverridesDto)
  channelOverrides?: PreferredHoursChannelOverridesDto;
}

export class BaseSubscriberFieldsDto {
  @ApiPropertyOptional({
    description: 'First name of the subscriber',
    example: 'John',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.firstName !== null)
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'Last name of the subscriber',
    example: 'Doe',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.lastName !== null)
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'Email address of the subscriber',
    example: 'john.doe@example.com',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.email !== null)
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Phone number of the subscriber',
    example: '+1234567890',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.phone !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Avatar URL or identifier',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.avatar !== null)
  @IsString()
  avatar?: string | null;

  @ApiPropertyOptional({
    description: 'Locale of the subscriber',
    example: 'en-US',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.locale !== null)
  @IsLocale()
  locale?: string | null;

  @ApiPropertyOptional({
    description: 'Timezone of the subscriber',
    example: 'America/New_York',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.timezone !== null)
  @IsTimeZone()
  timezone?: string | null;

  @ApiPropertyOptional({
    description:
      'Daily preferred contact hours in the subscriber timezone. When null/omitted, notifications are not restricted by time of day.',
    type: PreferredHoursDto,
    nullable: true,
    example: { start: '09:00', end: '18:00' },
  })
  @IsOptional()
  @ValidateIf((obj) => obj.preferredHours !== null)
  @ValidateNested()
  @Type(() => PreferredHoursDto)
  preferredHours?: PreferredHoursDto | null;

  @ApiPropertyOptional({
    type: Object,
    description: 'Additional custom data associated with the subscriber',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  data?: SubscriberCustomData | null;
}
