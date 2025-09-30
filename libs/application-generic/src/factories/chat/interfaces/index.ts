import { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { IChatOptions, ISendMessageSuccessResponse } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface IChatHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);
  buildProvider(credentials: ICredentials);
  send(chatData: IChatOptions): Promise<ISendMessageSuccessResponse>;
}

export interface IChatFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): IChatHandler | null;
}
