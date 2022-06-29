import { ChannelCTATypeEnum, ChannelTypeEnum, ButtonTypeEnum } from '@novu/shared';

export class MessageTemplateEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  _creatorId: string;

  type: ChannelTypeEnum;

  content: string | IEmailBlock[];

  contentType?: 'editor' | 'customHtml';

  active?: boolean;

  subject?: string;

  name?: string;

  _feedId?: string;

  cta?: {
    type: ChannelCTATypeEnum;
    data: {
      url?: string;
    };
    actions?: { type: ButtonTypeEnum; content: { text: string } }[];
  };

  _parentId?: string;
}

export class IEmailBlock {
  type: 'button' | 'text';

  content: string;

  url?: string;

  styles?: {
    textDirection?: 'rtl' | 'ltr';
  };
}
