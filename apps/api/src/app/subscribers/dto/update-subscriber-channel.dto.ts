import { DirectProviderIdEnum, IUpdateSubscriberChannelDto } from '@novu/shared';
import { IsDefined, IsObject, IsString } from 'class-validator';
import { IChannelCredentialsCommand } from '../usecases/update-subscriber-channel';

export class UpdateSubscriberChannelDto implements IUpdateSubscriberChannelDto {
  @IsString()
  @IsDefined()
  providerId: DirectProviderIdEnum;

  @IsDefined()
  @IsObject()
  credentials: IChannelCredentialsCommand;
}
