import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';

export class UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    enum: { ...ChatProviderIdEnum, ...PushProviderIdEnum },
    description: 'The provider identifier for the credentials',
  })
  @IsString()
  @IsDefined()
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    type: String,
    description: 'The integration identifier',
  })
  @IsString()
  @IsOptional()
  integrationIdentifier?: string;

  @ApiProperty({
    description: 'Credentials payload for the specified provider',
  })
  @IsDefined()
  @IsObject()
  credentials: ChannelCredentials;
}
