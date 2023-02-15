import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';
import { Resend } from 'resend';

export class ResendEmailProvider implements IEmailProvider {
  id = 'resend';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private resendClient: Resend;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.resendClient = new Resend(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const resendResponse = await this.resendClient.sendEmail({
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return {
      id: resendResponse[0].id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      await this.resendClient.sendEmail({
        from: options.from || this.config.from,
        to: options.to,
        subject: options.subject,
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
}
