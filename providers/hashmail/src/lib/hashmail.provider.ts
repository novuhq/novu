import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
} from '@novu/stateless';

export class HashmailEmailProvider implements IEmailProvider {
  id = 'hashmail';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private myHeaders: Headers;
  private formData: FormData;

  constructor(private config: { apiKey: string; from: string }) {
    this.myHeaders = new Headers();
    this.myHeaders.append('authorization', `Bearer ${this.config.apiKey}`);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const requestOptions = this.createRequestOptions(options);
    const response = await this.sendWithHashMail(requestOptions);
    const result = await response.json();

    return {
      id: result.key,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const requestOptions = this.createRequestOptions(options);
      const response = await this.sendWithHashMail(requestOptions);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error || error?.message || 'Integration check failed.',
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private createRequestOptions(options: IEmailOptions): {
    method: string;
    headers: Headers;
    body: FormData;
  } {
    this.formData.append('sender_address', options.from || this.config.from);
    this.formData.append('to_address', options.to);
    this.formData.append('subject', options.subject);
    this.formData.append('content', options.text);
    this.formData.append('bcc_address', options.bcc);
    this.formData.append('cc_address', options.cc);

    return {
      method: 'POST',
      headers: this.myHeaders,
      body: this.formData,
    };
  }

  private async sendWithHashMail(requestOptions: {
    method: string;
    headers: Headers;
    body: FormData;
  }) {
    const response = await fetch(
      'https://api.hashmail.dev/dapp/messages/send',
      requestOptions
    );

    return response;
  }
}
