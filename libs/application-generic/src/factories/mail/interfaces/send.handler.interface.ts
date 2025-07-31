import { ChannelTypeEnum, ICredentials, IEmailOptions } from '@novu/shared';
import { ICheckIntegrationResponse, IEmailProvider, ISendMessageSuccessResponse } from '@novu/stateless';

export interface IMailHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials, from?: string);

  send(mailData: IEmailOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): IEmailProvider;

  check(): Promise<ICheckIntegrationResponse>;
}
