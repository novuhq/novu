import {
  ActorTypeEnum,
  ChannelCTATypeEnum,
  IEmailBlock,
  ITemplateVariable,
  StepTypeEnum,
  TemplateVariableTypeEnum,
} from '../../types';
import { TriggerContextTypeEnum } from '../notification-template';

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
export const TemplateSystemVariables = ['subscriber', 'step', 'branding', 'tenant', 'preheader'];

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
  tenant: {
    name: 'string',
    data: 'object',
  },
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TriggerReservedVariables = ['tenant'];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ReservedVariablesMap = {
  [TriggerContextTypeEnum.TENANT]: [{ name: 'identifier', type: TemplateVariableTypeEnum.STRING }],
};
