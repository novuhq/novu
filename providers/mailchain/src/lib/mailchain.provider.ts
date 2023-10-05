import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  IEmailEventBody,
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
    }
  ) {
    this.mailchainClient = Mailchain.fromSecretRecoveryPhrase(
      config.secretRecoveryPhrase
    );
  }

  getMessageId?: (body: any) => string[];
  parseEventBody?: (body: any, identifier: string) => IEmailEventBody;

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const user = await this.mailchainClient.user();
      await this.mailchainClient.sendMail({
        from: user.address || this.config.from,
        to: options.to,
        subject: options.subject,
        content: {
          text: options.text,
          html: options.html,
        },
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
    const user = await this.mailchainClient.user();
    console.log(`username: ${user.username}, address: ${user.address}`);

    const result = await this.mailchainClient.sendMail({
      from: user.address || this.config.from,
      to: options.to,
      subject: options.subject,
      content: {
        text: options.text,
        html: options.html,
      },
    });

    console.log(result.data);

    const savedMessageId = '12345';

    return {
      id: savedMessageId,
      date: new Date().toISOString(),
    };
  }
}
