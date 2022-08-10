import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { DirectProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { IChannelCredentials } from './update-subscriber.dto';

export class UpdateSubscriberChannelRequestDto {
  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
  })
  @IsString()
  @IsDefined()
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty()
  @IsDefined()
  @IsObject()
  credentials: IChannelCredentials;
}
