import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatProviderIdEnum, IChannelCredentials, PushProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BaseSubscriberFieldsDto } from '../../shared/dtos/base-subscriber-fields.dto';

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

export class CreateSubscriberRequestDto extends BaseSubscriberFieldsDto {
  @ApiProperty({
    description:
      'The internal identifier you used to create this subscriber, usually correlates to the id the user in your systems',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'SubscriberId is required',
  })
  subscriberId: string;

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
