import { JSONSchemaEntity } from '@novu/dal';
import {
  getToolProviderOverrideKeysOnlySchema,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

const toolProviderOverrideValueSchema = z.record(z.unknown());

export const toolControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    enabledIntegrations: z.array(z.string()).optional(),
    providerOverrides: z
      .object({
        [ToolProviderIdEnum.PagerDuty]: toolProviderOverrideValueSchema.optional(),
        [ToolProviderIdEnum.Opsgenie]: toolProviderOverrideValueSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ToolControlType = z.infer<typeof toolControlZodSchema>;

/**
 * Replaces the permissive per-provider override subschemas generated from Zod with
 * keys-only variants (strict on property names, permissive on values), so unknown
 * override keys surface as step issues without false-positives on Liquid values.
 */
function withStrictProviderOverrideKeys(schema: JSONSchemaEntity): JSONSchemaEntity {
  const providerOverrides = schema.properties?.providerOverrides;
  if (!providerOverrides || typeof providerOverrides === 'boolean' || !providerOverrides.properties) {
    return schema;
  }

  for (const providerId of TOOL_CONTENT_OVERRIDE_PROVIDER_IDS) {
    const keysOnlySchema = getToolProviderOverrideKeysOnlySchema(providerId);
    if (keysOnlySchema && providerOverrides.properties[providerId]) {
      providerOverrides.properties[providerId] = keysOnlySchema as unknown as JSONSchemaEntity;
    }
  }

  return schema;
}

export const toolControlSchema = withStrictProviderOverrideKeys(
  zodToJsonSchema(toolControlZodSchema, defaultOptions) as JSONSchemaEntity
);
export const toolUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.TOOL,
  properties: {
    body: {
      component: UiComponentEnum.TOOL_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
