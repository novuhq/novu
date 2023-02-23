import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsLocale, IsOptional, IsString } from 'class-validator';
import { SubscriberCustomData } from '@novu/shared';

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
