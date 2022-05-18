import { IDirectOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { ICredentials, IntegrationEntity, IChannelCredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface IDirectHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);
  buildProvider(credentials: ICredentials);
  send(directData: IDirectOptions): Promise<ISendMessageSuccessResponse>;
  setSubscriberCredentials(credentials: IChannelCredentials);
}

export interface IDirectFactory {
  getHandler(integration: IntegrationEntity): IDirectHandler;
}
