import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import {
  Braze,
  MessagesSendObject,
  UsersExportIdsObject,
  UsersExportIdsResponse,
} from 'braze-api';

export class BrazeEmailProvider implements IEmailProvider {
  id = 'braze';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private braze: Braze;

  constructor(
    private config: {
      apiKey: string;
      apiURL: string;
      appID: string;
    }
  ) {
    this.braze = new Braze(this.config.apiURL, this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const maildata = await this.createMailData(options);
    const response = await this.braze.messages.send(maildata);

    return {
      id: response.dispatch_id,
      date: new Date().toISOString(),
    };
  }
  private async mapToExternalID(options: string[]): Promise<string[]> {
    const externalIds: string[] = [];

    for (const email of options) {
      const exportObject: UsersExportIdsObject = {
        email_address: email,
      };

      const response: UsersExportIdsResponse =
        await this.braze.users.export.ids(exportObject);
      externalIds.push(...response.users.map((user) => user.external_id));
    }

    return externalIds;
  }

  private async createMailData(
    options: IEmailOptions
  ): Promise<MessagesSendObject> {
    const messageBody: MessagesSendObject = {
      broadcast: false,
      external_user_ids: await this.mapToExternalID(options.to),
      messages: {
        email: {
          app_id: this.config.appID,
          subject: options.subject,
          from: options.from,
          body: options.html,
          reply_to: options.replyTo || null,
          bcc: options.bcc?.join(','),
          plaintext_body: options.text || null,
          extras: options.payloadDetails || {},
          headers: {},
          should_inline_css: true,
          attachments: [],
        },
      },
    };

    if (options.attachments && options.attachments.length > 0) {
      messageBody.messages.email.attachments = options.attachments.map(
        (attachment) => {
          return {
            file_name: attachment.name || 'attachment',
            url: `data:${attachment.mime};base64,${attachment.file.toString(
              'base64'
            )}`,
          };
        }
      );
    }

    return messageBody;
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const testEmailMessage = await this.createMailData(options);

      const response = await this.braze.messages.send(testEmailMessage);

      if (response.message.includes('success')) {
        return {
          success: true,
          message: 'Integrated successfully!',
          code: CheckIntegrationResponseEnum.SUCCESS,
        };
      } else {
        return {
          success: false,
          message: 'Integration failed',
          code: CheckIntegrationResponseEnum.FAILED,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Integration check error: ' + error.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }
}
