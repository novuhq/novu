import { ChatProviderIdEnum, IUpdateSubscriberChannelDto, PushProviderIdEnum } from '@novu/shared';
import { IsDefined, IsObject, IsString } from 'class-validator';
import { IChannelCredentialsCommand } from '../usecases/update-subscriber-channel';

export class UpdateSubscriberChannelDto implements IUpdateSubscriberChannelDto {
  @IsString()
  @IsDefined()
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @IsDefined()
  @IsObject()
  credentials: IChannelCredentialsCommand;
}
