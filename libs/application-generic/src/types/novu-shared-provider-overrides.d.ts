/**
 * `@novu/shared` ships the generated Slack override schemas behind a package `exports` subpath so
 * they stay out of the dashboard bundle. Node resolves that subpath at runtime, but this repo
 * compiles with `moduleResolution: "node"`, which predates `exports` maps and cannot. Importing the
 * built file directly is not a way around it either: the `exports` map makes `./dist/**` a runtime
 * resolution error. Declaring the module here keeps the specifier Node accepts and restores types.
 */
declare module '@novu/shared/provider-overrides/slack' {
  import type { JSONSchemaDto } from '@novu/shared';

  export const slackOverrideJsonSchema: JSONSchemaDto;
  export const slackOverrideLiquidTolerantJsonSchema: JSONSchemaDto;
  export const SLACK_OVERRIDE_KEYS: readonly string[];
  export const SLACK_PRIMARY_CONTENT_KEY: string;
  export const SLACK_OVERRIDE_SCHEMA_SUBPATH: string;
}
