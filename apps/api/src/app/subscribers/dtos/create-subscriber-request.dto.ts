import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEmail,
  IsLocale,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChatProviderIdEnum, IChannelCredentials, PushProviderIdEnum, SubscriberCustomData } from '@novu/shared';
import { Type } from 'class-transformer';

export class ChannelCredentialsDto implements IChannelCredentials {
  @ApiPropertyOptional({
    description: 'The URL for the webhook associated with the channel.',
    type: String,
  })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'An array of device tokens for push notifications.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  deviceTokens?: string[];
}

export class SubscriberChannelDto {
  @ApiProperty({
    description: 'The ID of the chat or push provider.',
    enum: [...Object.values(ChatProviderIdEnum), ...Object.values(PushProviderIdEnum)],
  })
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiPropertyOptional({
    description: 'An optional identifier for the integration.',
    type: String,
  })
  @IsOptional()
  integrationIdentifier?: string;

  @ApiProperty({
    description: 'Credentials for the channel.',
    type: ChannelCredentialsDto,
  })
  @ValidateNested()
  @Type(() => ChannelCredentialsDto)
  credentials: ChannelCredentialsDto;
}

export class CreateSubscriberRequestDto {
  @ApiProperty({
    description:
      'The internal identifier you used to create this subscriber, usually correlates to the id the user in your systems',
  })
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ApiPropertyOptional({
    description: 'The email address of the subscriber.',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The first name of the subscriber.',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the subscriber.',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the subscriber.',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'An HTTP URL to the profile image of your subscriber.',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'The locale of the subscriber.',
  })
  @IsLocale()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({
    type: 'object',
    description: 'An optional payload object that can contain any properties.',
    required: false,
    additionalProperties: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
        { type: 'boolean' },
        { type: 'number' },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  data?: SubscriberCustomData;

  @ApiPropertyOptional({
    type: [SubscriberChannelDto],
    description: 'An optional array of subscriber channels.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriberChannelDto)
  channels?: SubscriberChannelDto[];
}

export class BulkSubscriberCreateDto {
  @ApiProperty({
    description: 'An array of subscribers to be created in bulk.',
    type: [CreateSubscriberRequestDto], // Specify the type of the array elements
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSubscriberRequestDto)
  subscribers: CreateSubscriberRequestDto[];
}
