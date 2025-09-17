export enum ContextTypeEnum {
  TENANT = 'tenant',
  APP = 'app',
}

export type ContextId = string;

export type ContextData = Record<string, unknown>;

export const CONTEXT_IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;
