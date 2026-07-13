import { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ISendMessageSuccessResponse, ISignalsOptions } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface ISignalsHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(options: ISignalsOptions): Promise<ISendMessageSuccessResponse>;
}

export interface ISignalsFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): ISignalsHandler | null;
}
