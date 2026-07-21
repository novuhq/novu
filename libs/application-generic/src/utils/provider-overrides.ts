import { ControlValuesEntity } from '@novu/dal';
import {
  ContentIssueEnum,
  getToolProviderOverrideKeysOnlySchema,
  RuntimeIssue,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  ToolProviderIdEnum,
} from '@novu/shared';
import Ajv, { ErrorObject } from 'ajv';

export type StepProviderOverrides = Partial<Record<ToolProviderIdEnum, Record<string, unknown>>>;

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

function getErrorPath(error: ErrorObject): string | undefined {
  const path = error.instancePath.substring(1);
  const { missingProperty, additionalProperty } = error.params;
  const appendedProperty = (missingProperty ?? additionalProperty) as string | undefined;

  if (!path || path.trim().length === 0) {
    return appendedProperty;
  }

  const fullPath = appendedProperty ? `${path}/${appendedProperty}` : path;

  return fullPath?.replace(/\//g, '.');
}

/**
 * Validates each provider override blob against its keys-only schema and returns
 * step issues namespaced as `providerOverrides.<providerId>.<key>`.
 */
export function processProviderOverridesIssues(providerOverrides: StepProviderOverrides | null | undefined): {
  controls?: Record<string, RuntimeIssue[]>;
} {
  if (!providerOverrides) {
    return {};
  }

  const controls: Record<string, RuntimeIssue[]> = {};
  const ajv = new Ajv({ allErrors: true, strict: false });

  for (const [providerId, overrideValues] of Object.entries(providerOverrides)) {
    if (!isSupportedToolProviderOverrideId(providerId)) {
      controls[`providerOverrides.${providerId}`] = [
        {
          message: `"${providerId}" is not a supported provider for content overrides`,
          issueType: ContentIssueEnum.UNSUPPORTED_PROPERTY,
          variableName: `providerOverrides.${providerId}`,
        },
      ];
      continue;
    }

    if (overrideValues == null || typeof overrideValues !== 'object' || Array.isArray(overrideValues)) {
      controls[`providerOverrides.${providerId}`] = [
        {
          message: 'Provider override must be an object',
          issueType: ContentIssueEnum.MISSING_VALUE,
          variableName: `providerOverrides.${providerId}`,
        },
      ];
      continue;
    }

    const keysOnlySchema = getToolProviderOverrideKeysOnlySchema(providerId);
    if (!keysOnlySchema) {
      continue;
    }

    const validate = ajv.compile(keysOnlySchema);
    const isValid = validate(overrideValues);
    const errors = validate.errors as null | ErrorObject[];

    if (isValid || !errors?.length) {
      continue;
    }

    for (const error of errors) {
      const relativePath = getErrorPath(error);
      if (!relativePath) {
        continue;
      }

      const namespacedPath = `providerOverrides.${providerId}.${relativePath}`;
      if (!controls[namespacedPath]) {
        controls[namespacedPath] = [];
      }

      const message =
        error.keyword === 'additionalProperties'
          ? `"${error.params.additionalProperty}" is not a supported property`
          : error.message || 'Invalid value';

      controls[namespacedPath].push({
        message,
        issueType:
          error.keyword === 'additionalProperties'
            ? ContentIssueEnum.UNSUPPORTED_PROPERTY
            : ContentIssueEnum.MISSING_VALUE,
        variableName: namespacedPath,
      });
    }
  }

  return Object.keys(controls).length > 0 ? { controls } : {};
}
