import { ControlValuesEntity, JsonSchemaTypeEnum } from '@novu/dal';
import {
  getToolProviderOverrideKeys,
  type StepProviderOverrides,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
} from '@novu/shared';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { type ControlIssues, processControlValuesBySchema } from './issues';

export type { StepProviderOverrides };

const SUPPORTED_PROVIDER_IDS = new Set<string>(TOOL_CONTENT_OVERRIDE_PROVIDER_IDS);

/** Always-valid property schema — matches shared keys-only contract (boolean `true`). */
const ALWAYS_VALID_PROPERTY = true as unknown as JSONSchemaDto;

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
    const keys = getToolProviderOverrideKeys(providerId);
    if (!keys) {
      properties[providerId] = {
        type: JsonSchemaTypeEnum.OBJECT,
        additionalProperties: true,
      };

      continue;
    }

    properties[providerId] = {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: Object.fromEntries(keys.map((key) => [key, ALWAYS_VALID_PROPERTY])),
      additionalProperties: false,
    };
  }

  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      providerOverrides: {
        type: JsonSchemaTypeEnum.OBJECT,
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
