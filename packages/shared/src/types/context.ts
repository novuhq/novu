import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';

export type Context = {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  identifier: ContextId;
  type: ContextTypeEnum;
  data: ContextData;

  createdAt: string;
  updatedAt: string;
};

export enum ContextTypeEnum {
  TENANT = 'tenant',
  APP = 'app',
}

export type ContextId = string;

export type ContextData = Record<string, unknown>;

export const CONTEXT_IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

export type ContextTypeKey = Partial<Record<ContextTypeEnum, string>>;

export type ContextObject = {
  identifier: ContextId;
  type?: ContextTypeEnum;
  data?: ContextData;
};

export type ContextPayload = ContextId | ContextTypeKey | ContextObject;

function isValidIdentifier(value: string): boolean {
  return value.length >= 1 && value.length <= 100 && CONTEXT_IDENTIFIER_REGEX.test(value);
}

export function isStringContext(context: ContextPayload): context is ContextId {
  return typeof context === 'string' && isValidIdentifier(context);
}

export function isTypeKeyContext(context: ContextPayload): context is ContextTypeKey {
  return (
    typeof context === 'object' &&
    context !== null &&
    !('identifier' in context) &&
    Object.keys(context).length === 1 &&
    Object.values(ContextTypeEnum).includes(Object.keys(context)[0] as ContextTypeEnum) &&
    isValidIdentifier(Object.values(context)[0] as string)
  );
}

export function isFullObjectContext(context: ContextPayload): context is ContextObject {
  return (
    typeof context === 'object' &&
    context !== null &&
    'identifier' in context &&
    typeof context.identifier === 'string' &&
    isValidIdentifier(context.identifier)
  );
}
