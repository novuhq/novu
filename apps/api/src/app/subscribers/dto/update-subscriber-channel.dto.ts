import { DirectIntegrationId, IUpdateSubscriberChannelDto } from '@novu/shared';
import { IChannelCredentialsCommand } from '../usecases/update-subscriber-channel';

export class UpdateSubscriberChannelDto implements IUpdateSubscriberChannelDto {
  integrationId: DirectIntegrationId;

  credentials: IChannelCredentialsCommand;
}
