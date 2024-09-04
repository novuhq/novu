import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { Infobip, AuthType } from '@infobip-api/sdk';
import { EmailProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class InfobipEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  id = EmailProviderIdEnum.Infobip;

  private infobipClient;

  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    },
  ) {
    super();
    this.infobipClient = new Infobip({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    try {
      await this.infobipClient.channels.email.send({
        to: options.to,
        from: this.config.from || options.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.email.send(
      this.transform(bridgeProviderData, {
        to: options.to,
        from: options.from || this.config.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }).body,
    );
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
