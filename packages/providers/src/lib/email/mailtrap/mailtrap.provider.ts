import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { MailtrapClient, Address, Mail } from 'mailtrap';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MailtrapEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  id = EmailProviderIdEnum.Mailtrap;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly mailtrapClient: MailtrapClient;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    },
  ) {
    super();
    this.mailtrapClient = new MailtrapClient({
      token: config.apiKey,
    });
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    try {
      const result = await this.sendWithMailtrap(options);

      return {
        success: result.success,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'Integration check failed.',
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.sendWithMailtrap(options, bridgeProviderData);

    return {
      id: response.message_ids[0],
      date: new Date().toISOString(),
    };
  }

  private sendWithMailtrap(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ) {
    return this.mailtrapClient.send(
      this.transform<Mail>(bridgeProviderData, {
        to: options.to.map(this.mapAddress),
        from: this.mapAddress(options.from || this.config.from),
        subject: options.subject,
        text: options.text,
        html: options.html,
        bcc: options.bcc?.map(this.mapAddress),
        cc: options.cc?.map(this.mapAddress),
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.name,
          content: attachment.file,
          type: attachment.mime,
        })),
      }).body,
    );
  }

  private mapAddress(email: string): Address {
    return { email };
  }
}
