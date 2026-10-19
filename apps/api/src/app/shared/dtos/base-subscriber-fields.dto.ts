import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriberCustomData } from '@novu/shared';
import { IsEmail, IsLocale, IsObject, IsOptional, IsString, IsTimeZone, ValidateIf } from 'class-validator';

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
