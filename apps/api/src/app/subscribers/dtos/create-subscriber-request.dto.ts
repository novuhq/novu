import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsLocale,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ChatProviderIdEnum,
  IChannelCredentials,
  ISubscriberChannel,
  PushProviderIdEnum,
  SubscriberCustomData,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { SubscriberPayloadDto, TopicPayloadDto } from '../../events/dtos';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  channels?: SubscriberChannelDto[];
}

export class SubscriberChannelDto {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiPropertyOptional()
  integrationIdentifier?: string;

  credentials: ChannelCredentialsDto;
}

export class ChannelCredentialsDto implements IChannelCredentials {
  webhookUrl?: string;
  deviceTokens?: string[];
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
