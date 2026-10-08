/**
 * `@novu/shared` ships generated override schemas behind package `exports` subpaths so they stay
 * out of the dashboard bundle. Node resolves those subpaths at runtime, but this repo compiles with
 * `moduleResolution: "node"`, which predates `exports` maps and cannot. Importing the built file
 * directly is not a way around it either: the `exports` map makes `./dist/**` a runtime resolution
 * error. Declaring the modules here keeps the specifier Node accepts and restores types.
 */
declare module '@novu/shared/provider-overrides/slack' {
  import type { JSONSchemaDto } from '@novu/shared';

  export const slackOverrideJsonSchema: JSONSchemaDto;
  export const slackOverrideLiquidTolerantJsonSchema: JSONSchemaDto;
  export const SLACK_OVERRIDE_KEYS: readonly string[];
  export const SLACK_PRIMARY_CONTENT_KEY: string;
  export const SLACK_OVERRIDE_SCHEMA_SUBPATH: string;
}

declare module '@novu/shared/provider-overrides/telegram' {
  import type { JSONSchemaDto } from '@novu/shared';

  export const telegramOverrideJsonSchema: JSONSchemaDto;
  export const telegramOverrideLiquidTolerantJsonSchema: JSONSchemaDto;
  export const TELEGRAM_OVERRIDE_KEYS: readonly string[];
  export const TELEGRAM_PRIMARY_CONTENT_KEY: string;
  export const TELEGRAM_OVERRIDE_SCHEMA_SUBPATH: string;
}

declare module '@novu/shared/provider-overrides/whatsapp' {
  import type { JSONSchemaDto } from '@novu/shared';

  export const whatsappOverrideJsonSchema: JSONSchemaDto;
  export const whatsappOverrideLiquidTolerantJsonSchema: JSONSchemaDto;
  export const WHATSAPP_OVERRIDE_KEYS: readonly string[];
  export const WHATSAPP_PRIMARY_CONTENT_KEY: string;
  export const WHATSAPP_OVERRIDE_SCHEMA_SUBPATH: string;
}

declare module '@novu/shared/provider-overrides/fcm' {
  import type { JSONSchemaDto } from '@novu/shared';

  export const fcmOverrideJsonSchema: JSONSchemaDto;
  export const fcmOverrideLiquidTolerantJsonSchema: JSONSchemaDto;
  export const FCM_OVERRIDE_KEYS: readonly string[];
  export const FCM_PRIMARY_CONTENT_KEY: string;
  export const FCM_OVERRIDE_SCHEMA_SUBPATH: string;
}
