import {
  EnvironmentId,
  IActor,
  IMessageCTA,
  MessageTemplateContentType,
  OrganizationId,
  StepTypeEnum,
  UiSchemaGroupEnum,
  UiSchemaProperty,
} from '@novu/shared';
import type { ChangePropsValueType } from '../../types';
import { IEmailBlock, ITemplateVariable } from './types';

export class MessageTemplateEntity {
  _id?: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _creatorId: string;

  // TODO: Due a circular dependency I can't import LayoutId from Layout.
  _layoutId?: string | null;

  type: StepTypeEnum;

  variables?: ITemplateVariable[];

  content: string | IEmailBlock[];

  contentType?: MessageTemplateContentType;

  active?: boolean;

  subject?: string;

  title?: string;

  name?: string;

  stepId?: string;

  preheader?: string;

  senderName?: string;

  _feedId?: string;

  cta?: IMessageCTA;

  _parentId?: string;

  actor?: IActor;

  deleted?: boolean;

  controls?: ControlSchemas;

  output?: {
    schema: JSONSchemaEntity;
  };

  code?: string;
}
export class ControlSchemas {
  schema: JSONSchemaEntity;
  uiSchema?: UiSchemaEntity;
}
export type MessageTemplateDBModel = ChangePropsValueType<
  MessageTemplateEntity,
  '_environmentId' | '_organizationId' | '_creatorId' | '_layoutId' | '_feedId' | '_parentId'
>;

// Enum for JSON Schema types
export enum JsonSchemaTypeEnum {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
}
export enum JsonSchemaFormatEnum {
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'date-time',
  DURATION = 'duration',
  EMAIL = 'email',
  HOSTNAME = 'hostname',
  IDN_HOSTNAME = 'idn-hostname',
  IPV4 = 'ipv4',
  IPV6 = 'ipv6',
  JSON_POINTER = 'json-pointer',
  RELATIVE_JSON_POINTER = 'relative-json-pointer',
  REGEX = 'regex',
  URI = 'uri',
  URI_REFERENCE = 'uri-reference',
  URI_TEMPLATE = 'uri-template',
  URL = 'url',
  UUID = 'uuid',
  GUID = 'guid',
  PHONE = 'phone',
  PASSWORD = 'password',
  COLOR = 'color',
}
export class UiSchemaEntity {
  group?: UiSchemaGroupEnum;
  properties?: Record<string, UiSchemaProperty>;
}

export class JSONSchemaEntity {
  type?: JsonSchemaTypeEnum;
  format?: JsonSchemaFormatEnum;
  title?: string;
  description?: string;
  default?: any;
  const?: any;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: JSONSchemaEntity;
  required?: string[];
  properties?: Record<string, JSONSchemaEntity>;
  additionalProperties?: JSONSchemaEntity | boolean;
  enum?: any[];
  allOf?: JSONSchemaEntity[];
  anyOf?: JSONSchemaEntity[];
  oneOf?: JSONSchemaEntity[];
  not?: JSONSchemaEntity;
  if?: JSONSchemaEntity;
  then?: JSONSchemaEntity;
  else?: JSONSchemaEntity;
  contentEncoding?: string;
  contentMediaType?: string;
  dependentRequired?: Record<string, string[]>;
  dependentSchemas?: Record<string, JSONSchemaEntity>;
  $schema?: string;
  $id?: string;
  contentSchema?: JSONSchemaEntity;
  examples?: any[];
  multipleOf?: number;
}
