import {
  ActorTypeEnum,
  ChannelCTATypeEnum,
  IEmailBlock,
  ITemplateVariable,
  StepTypeEnum,
  TemplateVariableTypeEnum,
} from '../../types';

export type MessageTemplateContentType = 'editor' | 'customHtml';

export interface IMessageTemplate {
  _id?: string;
  subject?: string;
  name?: string;
  title?: string;
  type: StepTypeEnum;
  contentType?: MessageTemplateContentType;
  content: string | IEmailBlock[];
  variables?: ITemplateVariable[];
  cta?: {
    type: ChannelCTATypeEnum;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action?: any;
  };
  _feedId?: string;
  _layoutId?: string;
  active?: boolean;
  preheader?: string;
  senderName?: string;
  actor?: {
    type: ActorTypeEnum;
    data: string | null;
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TemplateSystemVariables = ['subscriber', 'step', 'branding', 'preheader'];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SystemVariablesWithTypes = {
  subscriber: {
    firstName: 'string',
    lastName: 'string',
    email: 'string',
    phone: 'string',
    avatar: 'string',
    locale: 'string',
    subscriberId: 'string',
  },
  step: {
    digest: 'boolean',
    events: 'array',
    total_count: 'number',
  },
  branding: {
    logo: 'string',
    color: 'string',
  },
};
