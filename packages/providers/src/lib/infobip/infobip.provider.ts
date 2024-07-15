import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { Infobip, AuthType } from '@infobip-api/sdk';
import { EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

export class InfobipSmsProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  id = SmsProviderIdEnum.Infobip;

  private infobipClient;

  constructor(
    private config: {
      baseUrl?: string;
      apiKey?: string;
      from?: string;
    }
  ) {
    this.infobipClient = new Infobip({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.sms.send({
      messages: [
        {
          text: options.content,
          destinations: [
            {
              to: options.to,
            },
          ],
          from: options.from || this.config.from,
          ...bridgeProviderData,
        },
      ],
    });
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}

export class InfobipEmailProvider implements IEmailProvider {
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  id = EmailProviderIdEnum.Infobip;

  private infobipClient;

  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    }
  ) {
    this.infobipClient = new Infobip({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  async checkIntegration(
    options: IEmailOptions
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
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.email.send({
      to: options.to,
      from: options.from || this.config.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
