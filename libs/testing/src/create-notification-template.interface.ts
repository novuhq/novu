import { ChannelTypeEnum } from '@novu/shared';
import { IEmailBlock, NotificationTemplateEntity } from '@novu/dal';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'messages'> {
  messages: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cta?: any;
    subject?: string;
    contentType?: 'editor' | 'customHtml';
    content: string | IEmailBlock[];
    name?: string;
    type: ChannelTypeEnum;
  }[];
}
