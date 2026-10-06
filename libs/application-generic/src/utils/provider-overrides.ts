import { ControlValuesEntity, JsonSchemaTypeEnum } from '@novu/dal';
import {
  CONTENT_OVERRIDE_PROVIDER_IDS,
  ContentIssueEnum,
  type ContentOverrideProviderId,
  FCM_OVERRIDE_SCHEMA_SUBPATH,
  getProviderOverrideConfig,
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  isRecord,
  type ProviderOverrideConfig,
  type RuntimeIssue,
  type JSONSchemaDto as SharedJSONSchemaDto,
  SLACK_OVERRIDE_SCHEMA_SUBPATH,
  type StepIntegrationOverrides,
  type StepProviderOverrides,
  TELEGRAM_OVERRIDE_SCHEMA_SUBPATH,
  WHATSAPP_OVERRIDE_SCHEMA_SUBPATH,
} from '@novu/shared';
import { fcmOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/fcm';
import { slackOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/slack';
import { telegramOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/telegram';
import { whatsappOverrideLiquidTolerantJsonSchema } from '@novu/shared/provider-overrides/whatsapp';
import type { ErrorObject } from 'ajv';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { type ControlIssues, mapSchemaErrorsToControlIssues } from './issues';
import { createLiquidTolerantValidator } from './liquid-tolerant-validator';

export type { StepIntegrationOverrides, StepProviderOverrides };

const SUPPORTED_PROVIDER_IDS = new Set<string>(CONTENT_OVERRIDE_PROVIDER_IDS);

/** Escape-hatch providers accept keys we cannot describe up front: well-formedness only. */
const FREE_FORM_OBJECT_SCHEMA: JSONSchemaDto = {
  type: JsonSchemaTypeEnum.OBJECT,
  additionalProperties: true,
};

function toValidatorSchema(schema: SharedJSONSchemaDto): JSONSchemaDto {
  // biome-ignore lint/plugin: the shared JSON Schema type and the API JSONSchemaDto class model the same JSON with different enum typings
  return schema as unknown as JSONSchemaDto;
}

/**
 * Schemas the shared registry only points at by subpath, resolved eagerly. The subpath exists to
 * keep a very large schema out of the dashboard bundle; on the server there is no bundle to protect.
 *
 * `provider-overrides.spec.ts` fails if the registry gains a subpath that is missing here, because
 * at runtime an unregistered one can only degrade to accepting anything.
 */
export const LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH: Readonly<Record<string, JSONSchemaDto>> = {
  [SLACK_OVERRIDE_SCHEMA_SUBPATH]: toValidatorSchema(slackOverrideLiquidTolerantJsonSchema),
  [TELEGRAM_OVERRIDE_SCHEMA_SUBPATH]: toValidatorSchema(telegramOverrideLiquidTolerantJsonSchema),
  [WHATSAPP_OVERRIDE_SCHEMA_SUBPATH]: toValidatorSchema(whatsappOverrideLiquidTolerantJsonSchema),
  [FCM_OVERRIDE_SCHEMA_SUBPATH]: toValidatorSchema(fcmOverrideLiquidTolerantJsonSchema),
};

export function isSupportedProviderOverrideId(providerId: string): providerId is ContentOverrideProviderId {
  return SUPPORTED_PROVIDER_IDS.has(providerId);
}

/**
 * Rebuilds the runtime `providerOverrides` map from STEP_PROVIDER_CONTROLS docs.
 */
export function stitchProviderOverridesFromDocs(
  docs: Array<
    Pick<ControlValuesEntity, 'providerId' | 'controls'> & Partial<Pick<ControlValuesEntity, 'integrationIdentifier'>>
  >
): StepProviderOverrides | undefined {
  const stitched: StepProviderOverrides = {};

  for (const doc of docs) {
    if (!doc.providerId || doc.integrationIdentifier || !isSupportedProviderOverrideId(doc.providerId)) {
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
 * Rebuilds the runtime `integrationOverrides` map (providerId → identifier → blob) from
 * STEP_INTEGRATION_CONTROLS docs.
 */
export function stitchIntegrationOverridesFromDocs(
  docs: Array<Pick<ControlValuesEntity, 'providerId' | 'integrationIdentifier' | 'controls'>>
): StepIntegrationOverrides | undefined {
  const stitched: StepIntegrationOverrides = {};

  for (const doc of docs) {
    if (!doc.providerId || !doc.integrationIdentifier || !isSupportedProviderOverrideId(doc.providerId)) {
      continue;
    }

    stitched[doc.providerId] = {
      ...stitched[doc.providerId],
      [doc.integrationIdentifier]: (doc.controls ?? {}) as Record<string, unknown>,
    };
  }

  if (Object.keys(stitched).length === 0) {
    return undefined;
  }

  return stitched;
}

function hasEntries(value: object | undefined): value is object {
  return !!value && Object.keys(value).length > 0;
}

/**
 * Merges stitched provider and integration overrides into a controls object for bridge/preview execution.
 */
export function withStitchedProviderOverrides(
  controls: Record<string, unknown>,
  providerOverrides: StepProviderOverrides | undefined,
  integrationOverrides?: StepIntegrationOverrides
): Record<string, unknown> {
  if (!hasEntries(providerOverrides) && !hasEntries(integrationOverrides)) {
    return controls;
  }

  return {
    ...controls,
    ...(hasEntries(providerOverrides) ? { providerOverrides } : {}),
    ...(hasEntries(integrationOverrides) ? { integrationOverrides } : {}),
  };
}

/**
 * A provider whose schema ships behind a subpath we never registered can only be accepted as-is:
 * refusing the whole request would turn a `@novu/shared` release into failing upserts and previews.
 */
function resolveLiquidTolerantSchema(config: ProviderOverrideConfig): JSONSchemaDto {
  if (config.liquidTolerantSchema) {
    return toValidatorSchema(config.liquidTolerantSchema);
  }

  if (!config.schemaSubpath) {
    return FREE_FORM_OBJECT_SCHEMA;
  }

  return LIQUID_TOLERANT_SCHEMAS_BY_SUBPATH[config.schemaSubpath] ?? FREE_FORM_OBJECT_SCHEMA;
}

/**
 * Keyed by schema rather than by provider so the escape-hatch providers, which all resolve to the
 * same free-form schema, share one validator. Building one is expensive: Slack's schema is a few
 * hundred kilobytes and gets both AJV-compiled and walked.
 */
const validatorsBySchema = new Map<JSONSchemaDto, ReturnType<typeof createLiquidTolerantValidator>>();

function getValidator(schema: JSONSchemaDto) {
  const cached = validatorsBySchema.get(schema);
  if (cached) {
    return cached;
  }

  const validate = createLiquidTolerantValidator(schema);
  validatorsBySchema.set(schema, validate);

  return validate;
}

function unsupportedPropertyIssue(path: string, property: string): RuntimeIssue {
  return {
    message: `"${property}" is not a supported property`,
    issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
    variableName: path,
  };
}

function hasMultipleExclusiveKeys(override: unknown, group: readonly string[]): boolean {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return false;
  }

  const record = override as Record<string, unknown>;
  let present = 0;

  for (const key of group) {
    if (key in record) {
      present += 1;
      if (present > 1) {
        return true;
      }
    }
  }

  return false;
}

/** Pairwise `allOf`/`not.required` constraints report as root `not` errors with message "must NOT be valid". */
function isExclusiveGroupAjvError(error: ErrorObject, groupKeys: ReadonlySet<string>): boolean {
  if (error.keyword !== 'not' || !error.schemaPath.includes('/allOf/')) {
    return false;
  }

  const negated = error.schema;
  if (!negated || typeof negated !== 'object' || Array.isArray(negated)) {
    return false;
  }

  const required = 'required' in negated ? negated.required : undefined;
  if (!Array.isArray(required) || required.length < 2) {
    return false;
  }

  return required.every((key) => typeof key === 'string' && groupKeys.has(key));
}

function exclusiveGroupMessage(group: readonly string[]): string {
  return `Only one of ${group.join(', ')} is allowed`;
}

/**
 * Rewrites exclusive-key-group failures (config + AJV pairwise `not`/`allOf`) to one friendly issue.
 */
function mapExclusiveKeyGroupIssues(
  override: unknown,
  providerPath: string,
  errors: ErrorObject[],
  exclusiveKeyGroups: readonly (readonly string[])[]
): Record<string, RuntimeIssue[]> {
  const conflictGroups = exclusiveKeyGroups.filter((group) => {
    const groupKeys = new Set(group);

    return (
      hasMultipleExclusiveKeys(override, group) || errors.some((error) => isExclusiveGroupAjvError(error, groupKeys))
    );
  });

  const filteredErrors = errors.filter(
    (error) => !conflictGroups.some((group) => isExclusiveGroupAjvError(error, new Set(group)))
  );

  const controls =
    mapSchemaErrorsToControlIssues(filteredErrors, {
      pathPrefix: providerPath,
      collapseUrlFieldErrors: false,
    }).controls ?? {};

  for (const group of conflictGroups) {
    controls[providerPath] = [
      ...(controls[providerPath] ?? []),
      {
        message: exclusiveGroupMessage(group),
        issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
        variableName: providerPath,
      },
    ];
  }

  return controls;
}

/**
 * Validates each provider override blob against that provider's Liquid-tolerant schema and returns
 * step issues namespaced as `providerOverrides.<providerId>.<path>`. Values are validated with the
 * Liquid still in them — they are only compiled at send time — so the tolerant schema variant
 * accepts a template wherever a concrete value is expected.
 *
 * Each blob is validated as its own root document rather than nested under one envelope schema,
 * because a provider schema may use absolute `$ref`s into its own `definitions` and those stop
 * resolving once the schema is nested under a wrapper.
 */
export function processProviderOverridesIssues(
  providerOverrides: StepProviderOverrides | null | undefined
): ControlIssues {
  if (!providerOverrides) {
    return {};
  }

  const controls: Record<string, RuntimeIssue[]> = {};

  for (const [providerId, override] of Object.entries(providerOverrides)) {
    const providerPath = `providerOverrides.${providerId}`;
    const config = getProviderOverrideConfig(providerId);

    if (!config) {
      controls[providerPath] = [unsupportedPropertyIssue(providerPath, providerId)];
      continue;
    }

    collectSchemaIssues(
      controls,
      resolveLiquidTolerantSchema(config),
      override,
      providerPath,
      config.exclusiveKeyGroups ?? []
    );
  }

  return Object.keys(controls).length === 0 ? {} : { controls };
}

/**
 * Validates each integration override against its provider's Liquid-tolerant schema and returns
 * step issues namespaced as `integrationOverrides.<providerId>.<identifier>.<path>`.
 */
export function processIntegrationOverridesIssues(
  integrationOverrides: StepIntegrationOverrides | null | undefined
): ControlIssues {
  if (!integrationOverrides) {
    return {};
  }

  const controls: Record<string, RuntimeIssue[]> = {};

  for (const [providerId, overridesByIdentifier] of Object.entries(integrationOverrides)) {
    const providerPath = `integrationOverrides.${providerId}`;
    const config = getProviderOverrideConfig(providerId);

    if (!config) {
      controls[providerPath] = [unsupportedPropertyIssue(providerPath, providerId)];
      continue;
    }

    if (!isRecord(overridesByIdentifier)) {
      collectSchemaIssues(controls, FREE_FORM_OBJECT_SCHEMA, overridesByIdentifier, providerPath);
      continue;
    }

    const schema = resolveLiquidTolerantSchema(config);

    for (const [identifier, override] of Object.entries(overridesByIdentifier)) {
      collectSchemaIssues(controls, schema, override, `${providerPath}.${identifier}`, config.exclusiveKeyGroups ?? []);
    }
  }

  return Object.keys(controls).length === 0 ? {} : { controls };
}

function collectSchemaIssues(
  controls: Record<string, RuntimeIssue[]>,
  schema: JSONSchemaDto,
  override: unknown,
  pathPrefix: string,
  exclusiveKeyGroups: readonly (readonly string[])[] = []
): void {
  const schemaErrors = getValidator(schema)(override);
  const overrideIssues =
    exclusiveKeyGroups.length > 0
      ? mapExclusiveKeyGroupIssues(override, pathPrefix, schemaErrors, exclusiveKeyGroups)
      : mapSchemaErrorsToControlIssues(schemaErrors, {
          pathPrefix,
          collapseUrlFieldErrors: false,
        }).controls;

  for (const [path, pathIssues] of Object.entries(overrideIssues ?? {})) {
    controls[path] = [...(controls[path] ?? []), ...pathIssues];
  }

  // Free-form schemas accept any key, but this one is how the bridge carries integration overrides.
  if (isRecord(override) && Object.prototype.hasOwnProperty.call(override, INTEGRATION_OVERRIDES_OUTPUT_KEY)) {
    const reservedPath = `${pathPrefix}.${INTEGRATION_OVERRIDES_OUTPUT_KEY}`;
    controls[reservedPath] = [unsupportedPropertyIssue(reservedPath, INTEGRATION_OVERRIDES_OUTPUT_KEY)];
  }
}
