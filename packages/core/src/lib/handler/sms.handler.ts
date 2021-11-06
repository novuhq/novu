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
    data.$attachments = data.$attachments?.filter((item) =>
      item.channels?.includes(ChannelTypeEnum.SMS)
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
      attachments: data.$attachments,
    });
  }
}
