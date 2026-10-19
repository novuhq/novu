import { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, IConfigurations, ICredentials, IEmailOptions } from '@novu/shared';
import { ICheckIntegrationResponse, IEmailProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

export interface IMailHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials & IConfigurations, from?: string);

  send(mailData: IEmailOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): IEmailProvider;

  check(): Promise<ICheckIntegrationResponse>;
}

export interface IMailFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): IMailHandler | null;
}
