import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { ChannelCredentials } from '../../shared/dtos/subscriber-channel';

export class UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
    description: 'Subscriber credentials for channel',
  })
  @IsString()
  @IsDefined()
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    description: 'Subscriber credentials for channel',
  })
  @IsDefined()
  @IsObject()
  credentials: ChannelCredentials;
}
