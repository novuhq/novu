import { IChatOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { ICredentials, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export interface IChatHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);
  buildProvider(credentials: ICredentials);
  send(chatData: IChatOptions): Promise<ISendMessageSuccessResponse>;
}

export interface IChatFactory {
  getHandler(integration: IntegrationEntity): IChatHandler;
}
