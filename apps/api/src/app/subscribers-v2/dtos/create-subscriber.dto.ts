import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SUBSCRIBER_ID_REGEX } from '@novu/shared';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsLocale,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateSubscriberRequestDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the subscriber',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'SubscriberId is required',
  })
  @Transform(({ value }) => value.trim())
  subscriberId: string;

  @ApiPropertyOptional({
    type: String,
    description: 'First name of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.firstName !== null)
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Last name of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.lastName !== null)
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Email address of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.email !== null)
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Phone number of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.phone !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Avatar URL or identifier',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.avatar !== null)
  @IsString()
  avatar?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Timezone of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.timezone !== null)
  @IsTimeZone()
  timezone?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Locale of the subscriber',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.locale !== null)
  @IsLocale()
  locale?: string | null;

  @ApiPropertyOptional({
    type: Object,
    description: 'Additional custom data for the subscriber',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  data?: Record<string, unknown> | null;
}
