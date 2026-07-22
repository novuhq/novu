import { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ISendMessageSuccessResponse, IToolOptions } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface IToolHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(options: IToolOptions): Promise<ISendMessageSuccessResponse>;
}

export interface IToolFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): IToolHandler | null;
}
