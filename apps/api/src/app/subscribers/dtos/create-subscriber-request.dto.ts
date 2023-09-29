import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEmail,
  IsLocale,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SubscriberCustomData } from '@novu/shared';
import { Type } from 'class-transformer';

export class CreateSubscriberRequestDto {
  @ApiProperty({
    description:
      'The internal identifier you used to create this subscriber, usually correlates to the id the user in your systems',
  })
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'An http url to the profile image of your subscriber',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional()
  @IsLocale()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: SubscriberCustomData;
}

export class BulkSubscriberCreateDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested()
  @Type(() => CreateSubscriberRequestDto)
  subscribers: CreateSubscriberRequestDto[];
}
