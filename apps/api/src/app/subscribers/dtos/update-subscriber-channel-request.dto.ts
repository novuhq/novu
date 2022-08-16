import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';

export class UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    enum: { ...ChatProviderIdEnum, ...PushProviderIdEnum },
    description: 'Subscriber credentials for channel',
  })
  @IsString()
  @IsDefined()
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    description: 'Subscriber credentials for channel',
  })
  @IsDefined()
  @IsObject()
  credentials: ChannelCredentials;
}
