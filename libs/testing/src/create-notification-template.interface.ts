import { ChannelTypeEnum } from '@notifire/shared';
import { IEmailBlock, NotificationTemplateEntity } from '@notifire/dal';

export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'messages'> {
  messages: {
    cta?: any;
    subject?: string;
    content: string | IEmailBlock[];
    name?: string;
    type: ChannelTypeEnum;
  }[];
}
