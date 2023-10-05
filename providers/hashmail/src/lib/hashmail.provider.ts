import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class HashmailEmailProvider implements IEmailProvider {
  id = 'hashmail';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private formData: FormData;
  private axiosInstance: AxiosInstance;

  constructor(private config: { apiKey: string; from: string }) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.hashmail.dev/app/messages/send',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const requestOptions = this.createRequestOptions(options);
    const response = await this.axiosInstance.request(requestOptions);
    const result = await response.data;

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
      const response = await this.axiosInstance.request(requestOptions);
      const result = await response.data;

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error || 'Integration check failed.',
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private createRequestOptions(options: IEmailOptions): {
    method: string;
    data: FormData;
  } {
    this.formData.append('sender_address', options.from || this.config.from);
    this.formData.append('to_address', options.to.join(', '));
    this.formData.append('subject', options.subject);
    this.formData.append('content', options.text);
    this.formData.append('bcc_address', options.bcc.join(', '));
    this.formData.append('cc_address', options.cc.join(', '));

    return {
      method: 'post',
      data: this.formData,
    };
  }
}
