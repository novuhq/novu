import { IStoreQuery } from '@novu/client';
import { ISubscriberJwt } from '@novu/shared';

export { IStoreQuery };

export interface ITab {
  name: string;
  storeId: string;
}

export interface IFeedsApiResponse {
  unseenCount: number;
}

export interface IPreferenceChannels {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
}

export interface IEmailBlock {
  type: 'text' | 'button';
  content: string;
  url?: string;
  styles?: {
    textAlign?: 'left' | 'right' | 'center';
  };
}

export enum TemplateVariableTypeEnum {
  STRING = 'String',
  ARRAY = 'Array',
  BOOLEAN = 'Boolean',
}

export enum ChannelTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
}

export enum StepTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
  DIGEST = 'digest',
  TRIGGER = 'trigger',
  DELAY = 'delay',
}

export enum ChannelCTATypeEnum {
  REDIRECT = 'redirect',
}

export type BuilderGroupValues = 'AND' | 'OR';

export type BuilderFieldType = 'BOOLEAN' | 'TEXT' | 'DATE' | 'NUMBER' | 'STATEMENT' | 'LIST' | 'MULTI_LIST' | 'GROUP';

export type BuilderFieldOperator =
  | 'LARGER'
  | 'SMALLER'
  | 'LARGER_EQUAL'
  | 'SMALLER_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'ALL_IN'
  | 'ANY_IN'
  | 'NOT_IN'
  | 'BETWEEN'
  | 'NOT_BETWEEN'
  | 'LIKE'
  | 'NOT_LIKE'
  | 'IN';

export enum ButtonTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  CLICKED = 'clicked',
}

export type ColorScheme = 'light' | 'dark';

export class ITemplateVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  required: boolean;
  defaultValue?: string | boolean;
}

export interface IMessageTemplate {
  _id?: string;
  subject?: string;
  name?: string;
  type: StepTypeEnum;
  contentType?: 'editor' | 'customHtml';
  content: string | IEmailBlock[];
  variables?: ITemplateVariable[];
  cta?: {
    type: ChannelCTATypeEnum;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
  _feedId?: string;
  active?: boolean;
}

export interface IMessageFilter {
  isNegated?: boolean;
  type: BuilderFieldType;
  value: BuilderGroupValues;
  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[];
}

export interface INotificationTemplateStep {
  _id?: string;
  filters?: IMessageFilter[];
  _templateId?: string;
  _parentId?: string;
  template?: IMessageTemplate;
  active?: boolean;
}

export enum TriggerTypeEnum {
  EVENT = 'event',
}

export interface INotificationTrigger {
  type: TriggerTypeEnum;
  identifier: string;
  variables: { name: string }[];
  subscriberVariables?: { name: string }[];
}

export interface INotificationTemplate {
  _id?: string;
  name: string;
  description?: string;
  _notificationGroupId: string;
  _parentId?: string;
  _environmentId: string;
  tags: string[];
  draft: boolean;
  active: boolean;
  critical: boolean;
  preferenceSettings: IPreferenceChannels;
  createdAt?: string;
  updatedAt?: string;
  steps: INotificationTemplateStep[];
  triggers: INotificationTrigger[];
}

export interface IMessageButton {
  type: ButtonTypeEnum;
  content: string;
  resultContent?: string;
}

export enum MessageActionStatusEnum {
  PENDING = 'pending',
  DONE = 'done',
}

export interface IMessageAction {
  status?: MessageActionStatusEnum;
  buttons?: IMessageButton[];
  result?: {
    payload?: Record<string, unknown>;
    type?: ButtonTypeEnum;
  };
}

export interface IMessageCTA {
  type?: ChannelCTATypeEnum;
  data: {
    url?: string;
  };
  action?: IMessageAction;
}

export interface IMessage {
  _id: string;
  _templateId: string;
  _environmentId: string;
  _organizationId: string;
  _notificationId: string;
  _subscriberId: string;
  _messageTemplateId: string;
  transactionId: string;
  template?: INotificationTemplate;
  templateIdentifier?: string;
  content: string | IEmailBlock[];
  channel: ChannelTypeEnum;
  seen: boolean;
  status: string;
  lastSeenDate?: string;
  createdAt: string;
  updatedAt: string;
  cta: IMessageCTA;
  _feedId: string;
  __v: number;
  payload?: Record<string, unknown>;
}

export enum ScreensEnum {
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
}

export interface IUserPreferenceSettings {
  template: { _id: string; name: string; critical: boolean };
  preference: { enabled: boolean; channels: IPreferenceChannels };
}

export interface IStore {
  storeId: string;
  query?: IStoreQuery;
}

export interface Session {
  token: string;
  profile: ISubscriberJwt;
}
