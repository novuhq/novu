import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

import { Mailchain, SendMailParams } from '@mailchain/sdk';

export class MailchainEmailProvider implements IEmailProvider {
  id = 'mailchain';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private mailchainClient: Mailchain;

  constructor(
    private config: {
      secretRecoveryPhrase: string;
      from: string;
      senderName?: string;
    }
  ) {
    this.mailchainClient = Mailchain.fromSecretRecoveryPhrase(
      config.secretRecoveryPhrase
    );
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const currentUser = await this.mailchainClient.user();
    const response = await this.mailchainClient.sendMail({
      from: currentUser.username
        ? `${currentUser.username} <${currentUser.address}>}`
        : currentUser.address,
      to: options.to,
      subject: options.subject,
      cc: options.cc,
      content: {
        text: options.text,
        html: options.html,
      },
      bcc: options.bcc,
    });

    return {
      id: response.data.savedMessageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const user = await this.mailchainClient.user();
      await this.mailchainClient.sendMail({
        from: user.address || this.config.from,
        to: options.to,
        subject: options.subject,
        cc: options.cc,
        content: {
          text: options.text,
          html: options.html,
        },
        bcc: options.bcc,
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
