import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { DirectProviderIdEnum, PushProviderIdEnum } from '../../consts';
import { IChannelCredentials, IUpdateSubscriberChannelDto } from './update-subscriber.dto';

export class UpdateSubscriberChannelRequestDto implements IUpdateSubscriberChannelDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty()
  @IsDefined()
  @IsObject()
  credentials: IChannelCredentials;
}
