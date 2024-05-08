import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  IEmailEventBody,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

import Plunk from '@plunk/node';
import { IPlunkResponse } from './plunk.interface';

export class PlunkEmailProvider implements IEmailProvider {
  id = 'plunk';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private plunk: Plunk;

  constructor(
    private config: {
      apiKey: string;
      senderName: string;
    }
  ) {
    this.plunk = new Plunk(this.config.apiKey);
  }
  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const response: IPlunkResponse = await this.plunk.emails.send({
        to: options.to,
        subject: options.subject,
        body: options.html || options.text,
      });

      return {
        success: response.success,
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
    const response: IPlunkResponse = await this.plunk.emails.send({
      from: options.from,
      name: options.senderName || this.config.senderName,
      to: options.to,
      subject: options.subject,
      body: options.html || options.text,
    });

    return {
      id: response.emails[0].contact.id,
      date: response.timestamp,
    };
  }
}
