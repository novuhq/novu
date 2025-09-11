export enum ContextTypeEnum {
  TENANT = 'tenant',
  APP = 'app',
}

export type ContextKey<T extends ContextTypeEnum = ContextTypeEnum> = `${T}:${string}`;

export type ContextData = Record<string, unknown>;
