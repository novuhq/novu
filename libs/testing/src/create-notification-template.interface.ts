import { ChannelTypeEnum, DigestUnit } from '@novu/shared';
import { IEmailBlock, NotificationTemplateEntity } from '@novu/dal';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'steps'> {
  steps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cta?: any;
    active?: boolean;
    subject?: string;
    contentType?: 'editor' | 'customHtml';
    content: string | IEmailBlock[];
    name?: string;
    type: ChannelTypeEnum;
    metadata?: {
      amount?: number;
      unit?: DigestUnit;
      batchkey?: string;
    };
  }[];
}
