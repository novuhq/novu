import { ControlValuesEntity } from '@novu/dal';
import {
  getToolProviderOverrideKeysOnlySchema,
  type StepProviderOverrides,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
} from '@novu/shared';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { type ControlIssues, processControlValuesBySchema } from './issues';

export type { StepProviderOverrides };

const SUPPORTED_PROVIDER_IDS = new Set<string>(TOOL_CONTENT_OVERRIDE_PROVIDER_IDS);

export function isSupportedToolProviderOverrideId(providerId: string): providerId is ToolProviderIdEnum {
  return SUPPORTED_PROVIDER_IDS.has(providerId);
}

/**
 * Rebuilds the runtime `providerOverrides` map from STEP_PROVIDER_CONTROLS docs.
 */
export function stitchProviderOverridesFromDocs(
  docs: Array<Pick<ControlValuesEntity, 'providerId' | 'controls'>>
): StepProviderOverrides | undefined {
  const stitched: StepProviderOverrides = {};

  for (const doc of docs) {
    if (!doc.providerId || !isSupportedToolProviderOverrideId(doc.providerId)) {
      continue;
    }

    stitched[doc.providerId] = (doc.controls ?? {}) as Record<string, unknown>;
  }

  if (Object.keys(stitched).length === 0) {
    return undefined;
  }

  return stitched;
}

/**
 * Merges stitched provider overrides into a controls object for bridge/preview execution.
 */
export function withStitchedProviderOverrides(
  controls: Record<string, unknown>,
  providerOverrides: StepProviderOverrides | undefined
): Record<string, unknown> {
  if (!providerOverrides || Object.keys(providerOverrides).length === 0) {
    return controls;
  }

  return {
    ...controls,
    providerOverrides,
  };
}

function buildProviderOverridesIssueSchema(): JSONSchemaDto {
  const properties: Record<string, JSONSchemaDto> = {};

  for (const providerId of TOOL_CONTENT_OVERRIDE_PROVIDER_IDS) {
    const keysOnlySchema = getToolProviderOverrideKeysOnlySchema(providerId);
    if (keysOnlySchema) {
      properties[providerId] = keysOnlySchema;
    }
  }

  return {
    type: 'object',
    properties: {
      providerOverrides: {
        type: 'object',
        properties,
        additionalProperties: false,
      },
    },
  };
}

const PROVIDER_OVERRIDES_ISSUE_SCHEMA = buildProviderOverridesIssueSchema();

/**
 * Validates each provider override blob against its keys-only schema and returns
 * step issues namespaced as `providerOverrides.<providerId>.<key>`.
 */
export function processProviderOverridesIssues(
  providerOverrides: StepProviderOverrides | null | undefined
): ControlIssues {
  if (!providerOverrides) {
    return {};
  }

  return processControlValuesBySchema({
    controlSchema: PROVIDER_OVERRIDES_ISSUE_SCHEMA,
    controlValues: { providerOverrides },
  });
}
