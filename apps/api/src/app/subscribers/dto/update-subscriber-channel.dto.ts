import { DirectProviderIdEnum, IUpdateSubscriberChannelDto } from '@novu/shared';
import { IChannelCredentialsCommand } from '../usecases/update-subscriber-channel';

export class UpdateSubscriberChannelDto implements IUpdateSubscriberChannelDto {
  providerId: DirectProviderIdEnum;

  credentials: IChannelCredentialsCommand;
}
