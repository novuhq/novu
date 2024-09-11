import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ChatProviderIdEnum, ISubscriberChannel, ProvidersIdEnum, PushProviderIdEnum } from '@novu/shared';

import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';

// eslint-disable-next-line @typescript-eslint/naming-convention
const ProviderIdChatAndPushEnum = { ...ChatProviderIdEnum, ...PushProviderIdEnum };
export class UpdateSubscriberChannelRequestDto implements ISubscriberChannel {
  @ApiProperty({
    enum: ProviderIdChatAndPushEnum,
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
