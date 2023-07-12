import { IEmailOptions } from '@novu/shared';
import {
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
} from '@novu/stateless';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';

export interface IMailHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials, from?: string);

  send(mailData: IEmailOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): IEmailProvider;

  check(): Promise<ICheckIntegrationResponse>;
}
