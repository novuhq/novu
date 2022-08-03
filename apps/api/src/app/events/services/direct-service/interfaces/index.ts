import { IDirectOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { ICredentials, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface IDirectHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);
  buildProvider(credentials: ICredentials);
  send(directData: IDirectOptions): Promise<ISendMessageSuccessResponse>;
}

export interface IDirectFactory {
  getHandler(integration: IntegrationEntity): IDirectHandler;
}
