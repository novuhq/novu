import { ChannelTypeEnum } from '@notifire/shared';
import { IEmailBlock, NotificationTemplateEntity } from '@notifire/dal';

export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'messages'> {
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cta?: any;
    subject?: string;
    content: string | IEmailBlock[];
    name?: string;
    type: ChannelTypeEnum;
  }[];
}
