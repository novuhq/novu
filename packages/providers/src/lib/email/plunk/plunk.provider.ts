import { EmailProviderIdEnum } from '@novu/shared';
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
import { SendParams } from '@plunk/node/dist/types/emails';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { IPlunkResponse } from './plunk.interface';

export class PlunkEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Plunk;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private plunk: Plunk;

  constructor(
    private config: {
      apiKey: string;
      senderName: string;
    },
  ) {
    super();
    this.plunk = new Plunk(this.config.apiKey);
  }
  async checkIntegration(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ICheckIntegrationResponse> {
    try {
      const response: IPlunkResponse = await this.plunk.emails.send({
        to: options.to,
        subject: options.subject,
        body: options.html || options.text,
        ...bridgeProviderData,
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
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const response: IPlunkResponse = await this.plunk.emails.send(
      this.transform<SendParams>(bridgeProviderData, {
        from: options.from,
        name: options.senderName || this.config.senderName,
        to: options.to,
        subject: options.subject,
        body: options.html || options.text,
      }).body,
    );

    return {
      id: response.emails[0].contact.id,
      date: response.timestamp,
    };
  }
}
