import { ControlValuesEntity, JsonSchemaTypeEnum } from '@novu/dal';
import {
  CONTENT_OVERRIDE_PROVIDER_IDS,
  type ContentOverrideProviderId,
  getProviderOverrideConfig,
  type ProviderOverrideConfig,
  SLACK_OVERRIDE_SCHEMA_SUBPATH,
  type StepProviderOverrides,
} from '@novu/shared';
import { slackOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/slack';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { type ControlIssues, mapSchemaErrorsToControlIssues, processControlValuesBySchema } from './issues';
import { createLiquidTolerantValidator } from './liquid-tolerant-validator';

export type { StepProviderOverrides };

const SUPPORTED_PROVIDER_IDS = new Set<string>(CONTENT_OVERRIDE_PROVIDER_IDS);

/** Always-valid property schema — matches shared keys-only contract (boolean `true`). */
const ALWAYS_VALID_PROPERTY = true as unknown as JSONSchemaDto;

/** Escape-hatch providers accept keys we cannot describe up front: well-formedness only. */
const FREE_FORM_OBJECT_SCHEMA: JSONSchemaDto = {
  type: JsonSchemaTypeEnum.OBJECT,
  additionalProperties: true,
};

/**
 * Schemas the shared registry only points at by subpath, resolved eagerly. The subpath exists to
 * keep a very large schema out of the dashboard bundle; on the server there is no bundle to protect.
 */
const LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH: Readonly<Record<string, JSONSchemaDto>> = {
  [SLACK_OVERRIDE_SCHEMA_SUBPATH]: slackOverrideLiquidTolerantJsonSchema as unknown as JSONSchemaDto,
};

export function isSupportedProviderOverrideId(providerId: string): providerId is ContentOverrideProviderId {
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
    if (!doc.providerId || !isSupportedProviderOverrideId(doc.providerId)) {
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

/**
 * Provider-id level only. Each override value is then validated against its own schema as a
 * separate root document, because a provider schema may use absolute `$ref`s into its own
 * `definitions` and those stop resolving once the schema is nested under a wrapper.
 */
function buildProviderOverridesEnvelopeSchema(): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      providerOverrides: {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: Object.fromEntries(CONTENT_OVERRIDE_PROVIDER_IDS.map((id) => [id, ALWAYS_VALID_PROPERTY])),
        additionalProperties: false,
      },
    },
  };
}

const PROVIDER_OVERRIDES_ENVELOPE_SCHEMA = buildProviderOverridesEnvelopeSchema();

function resolveLiquidTolerantSchema(config: ProviderOverrideConfig): JSONSchemaDto {
  if (config.liquidTolerantSchema) {
    return config.liquidTolerantSchema as unknown as JSONSchemaDto;
  }

  if (!config.schemaSubpath) {
    return FREE_FORM_OBJECT_SCHEMA;
  }

  const schema = LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH[config.schemaSubpath];
  if (!schema) {
    throw new Error(`No eagerly loaded override schema registered for subpath: ${config.schemaSubpath}`);
  }

  return schema;
}

const validatorsByProviderId = new Map<string, ReturnType<typeof createLiquidTolerantValidator>>();

/** Provider schemas are static and Slack's is large enough that recompiling per call is wasteful. */
function getProviderOverrideValidator(providerId: string, config: ProviderOverrideConfig) {
  const cached = validatorsByProviderId.get(providerId);
  if (cached) {
    return cached;
  }

  const validate = createLiquidTolerantValidator(resolveLiquidTolerantSchema(config));
  validatorsByProviderId.set(providerId, validate);

  return validate;
}

function collectIssues(target: ControlIssues, source: ControlIssues): ControlIssues {
  if (!source.controls) {
    return target;
  }

  const controls = { ...target.controls };
  for (const [path, pathIssues] of Object.entries(source.controls)) {
    controls[path] = [...(controls[path] ?? []), ...pathIssues];
  }

  return { controls };
}

/**
 * Validates each provider override blob against that provider's Liquid-tolerant schema and returns
 * step issues namespaced as `providerOverrides.<providerId>.<path>`. Values are validated with the
 * Liquid still in them — they are only compiled at send time — so the tolerant schema variant
 * accepts a template wherever a concrete value is expected.
 */
export function processProviderOverridesIssues(
  providerOverrides: StepProviderOverrides | null | undefined
): ControlIssues {
  if (!providerOverrides) {
    return {};
  }

  let issues = processControlValuesBySchema({
    controlSchema: PROVIDER_OVERRIDES_ENVELOPE_SCHEMA,
    controlValues: { providerOverrides },
  });

  for (const [providerId, override] of Object.entries(providerOverrides)) {
    const config = getProviderOverrideConfig(providerId);

    // Unsupported provider ids are already reported by the envelope schema.
    if (!config) {
      continue;
    }

    const errors = getProviderOverrideValidator(providerId, config)(override);
    if (errors.length === 0) {
      continue;
    }

    issues = collectIssues(
      issues,
      mapSchemaErrorsToControlIssues(errors, { pathPrefix: `providerOverrides.${providerId}` })
    );
  }

  return issues;
}
