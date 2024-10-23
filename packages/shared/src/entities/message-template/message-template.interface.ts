import { JSONSchema } from 'json-schema-to-ts';

import {
  ChannelCTATypeEnum,
  EnvironmentId,
  IEmailBlock,
  ITemplateVariable,
  MessageTemplateContentType,
  OrganizationId,
  StepTypeEnum,
  TemplateVariableTypeEnum,
  TriggerContextTypeEnum,
} from '../../types';
import { IActor } from '../actor';

export interface IMessageTemplate {
  id?: string;
  _id?: string;
  _environmentId?: EnvironmentId;
  _organizationId?: OrganizationId;
  _creatorId?: string;
  _feedId?: string;
  _layoutId?: string | null;
  _parentId?: string;
  subject?: string;
  name?: string;
  title?: string;
  type: StepTypeEnum;
  contentType?: MessageTemplateContentType;
  content: string | IEmailBlock[];
  variables?: ITemplateVariable[];
  cta?: {
    type: ChannelCTATypeEnum;
    data: {
      url?: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action?: any;
  };
  active?: boolean;
  preheader?: string;
  senderName?: string;
  actor?: IActor;
  inputs?: {
    schema: JSONSchema;
  };
  controls?: {
    schema: JSONSchema;
  };
  output?: {
    schema: JSONSchema;
  };
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const TemplateSystemVariables = ['subscriber', 'step', 'branding', 'tenant', 'preheader', 'actor'];

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
  actor: {
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

export const TriggerReservedVariables = ['tenant', 'actor'];

export const ReservedVariablesMap = {
  [TriggerContextTypeEnum.TENANT]: [{ name: 'identifier', type: TemplateVariableTypeEnum.STRING }],
  [TriggerContextTypeEnum.ACTOR]: [{ name: 'subscriberId', type: TemplateVariableTypeEnum.STRING }],
};
