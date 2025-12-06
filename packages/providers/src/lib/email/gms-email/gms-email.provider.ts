import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GmsEmailEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  id = EmailProviderIdEnum.GmsEmail;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      baseUrl: string;
      from: string;
      senderName: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;
    const from = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    const data = this.transform(bridgeProviderData, {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    // TODO: Implement actual API call to GMS service using this.config.baseUrl

    return {
      id: 'id_returned_by_provider',
      date: new Date().toISOString(),
    };
  }
}
