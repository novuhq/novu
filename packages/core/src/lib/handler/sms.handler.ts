import { compileTemplate } from '../content/content.engine';
import { ISmsProvider } from '../provider/provider.interface';
import {
  ChannelTypeEnum,
  IMessage,
  ITriggerPayload,
} from '../template/template.interface';

export class SmsHandler {
  constructor(private message: IMessage, private provider: ISmsProvider) {}

  async send(data: ITriggerPayload) {
    const attachments = data.$attachments?.filter((item) =>
      item.channels?.length
        ? item.channels?.includes(ChannelTypeEnum.SMS)
        : true
    );

    let content = '';
    if (typeof this.message.template === 'string') {
      content = compileTemplate(this.message.template, data);
    } else {
      content = await this.message.template(data);
    }

    if (!data.$phone) {
      throw new Error(
        '$phone is missing in trigger payload. To send an SMS You must specify a $phone property.'
      );
    }

    await this.provider.sendMessage({
      to: data.$phone,
      content,
      attachments: attachments,
    });
  }
}
