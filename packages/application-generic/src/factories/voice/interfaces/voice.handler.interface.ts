import {
  ISendMessageSuccessResponse,
  IVoiceOptions,
  IVoiceProvider,
} from '@novu/stateless';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';

export interface IVoiceHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);

  buildProvider(credentials: ICredentials);

  send(voiceOptions: IVoiceOptions): Promise<ISendMessageSuccessResponse>;

  getProvider(): IVoiceProvider;
}
