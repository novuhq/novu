import { ChannelTypeEnum, DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { IEmailBlock, NotificationTemplateEntity } from '@novu/dal';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CreateTemplatePayload extends Omit<NotificationTemplateEntity, 'steps'> {
  noFeedId?: boolean;
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
      unit?: DigestUnitEnum;
      digestKey?: string;
      type: DigestTypeEnum;
      backoffUnit?: DigestUnitEnum;
      backoffAmount?: number;
      updateMode?: boolean;
    };
  }[];
}
