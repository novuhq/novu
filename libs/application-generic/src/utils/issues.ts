import { ContentIssueEnum, RuntimeIssue, StepTypeEnum } from '@novu/shared';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { capitalize } from '../services/helper-service';
import { buildVariables } from './build-variables';
import { buildLiquidParser } from './template-parser/liquid-engine';

const getErrorPath = (error: ErrorObject): string => {
  const path = error.instancePath.substring(1);
  const { missingProperty, additionalProperty } = error.params;
  const appendedProperty = (missingProperty ?? additionalProperty) as string | undefined;

  if (!path || path.trim().length === 0) {
    return appendedProperty as string;
  }

  const fullPath = appendedProperty ? `${path}/${appendedProperty}` : path;

  return fullPath?.replace(/\//g, '.');
};

const isUrlFieldError = (errorPath: string | undefined, instancePath: string): boolean => {
  return (
    (errorPath &&
      (errorPath === 'url' || errorPath.endsWith('.url') || errorPath === 'avatar' || errorPath === 'redirect')) ||
    instancePath === '/url' ||
    instancePath.includes('/url') ||
    instancePath === '/avatar' ||
    instancePath === '/redirect'
  );
};

const mapAjvErrorToMessage = (
  error: ErrorObject<string, Record<string, unknown>, unknown>,
  stepType?: StepTypeEnum
): string => {
  if (stepType === StepTypeEnum.IN_APP) {
    if (error.keyword === 'required') {
      return 'Subject or body is required';
    }
    if (error.keyword === 'minLength') {
      return `${capitalize(error.instancePath.replace('/', ''))} is required`;
    }
  }

  if (error.keyword === 'required') {
    return `${capitalize(error.params.missingProperty as string)} is required`;
  }
  if (error.keyword === 'minLength') {
    return `${capitalize(error.instancePath.replace('/', ''))} is required`;
  }
  if (error.keyword === 'additionalProperties') {
    return `"${error.params.additionalProperty}" is not a supported property`;
  }

  // Check if this is a URL field error
  const errorPath = getErrorPath(error);
  const instancePath = error.instancePath || '';
  const isUrlField = isUrlFieldError(errorPath, instancePath);

  // Handle URL validation errors (anyOf from Zod union, or pattern errors)
  if (isUrlField && (error.keyword === 'anyOf' || error.keyword === 'pattern')) {
    if (stepType === StepTypeEnum.HTTP_REQUEST) {
      return `Invalid URL. Must be a valid absolute URL (https://...) or {{variable}}`;
    }

    return `Invalid URL. Must be a valid full URL, path starting with /, or {{variable}}`;
  }

  return error.message || 'Invalid value';
};

const mapAjvErrorToIssueType = (error: ErrorObject, isUrlField = false): ContentIssueEnum => {
  switch (error.keyword) {
    case 'required':
    case 'type':
      return ContentIssueEnum.MISSING_VALUE;
    case 'pattern':
    case 'anyOf':
      return isUrlField ? ContentIssueEnum.INVALID_URL : ContentIssueEnum.MISSING_VALUE;
    case 'additionalProperties':
      return ContentIssueEnum.UNSUPPORTED_PROPERTY;
    default:
      return ContentIssueEnum.MISSING_VALUE;
  }
};

export type ControlIssues = {
  controls?: Record<string, RuntimeIssue[]>;
};

/** Single AJV configuration for every control-value schema check, so issues stay consistent. */
export const createSchemaValidationAjv = ({ verbose = false }: { verbose?: boolean } = {}): Ajv => {
  const ajv = new Ajv({ allErrors: true, strict: false, verbose });
  addFormats(ajv);

  return ajv;
};

const joinIssuePath = (pathPrefix: string | undefined, errorPath: string | undefined): string | undefined => {
  const segments = [pathPrefix, errorPath].filter((segment): segment is string => Boolean(segment?.trim()));

  return segments.length === 0 ? undefined : segments.join('.');
};

/**
 * Turns AJV errors into `StepIssue`s keyed by control path. `pathPrefix` namespaces the result for
 * values validated against their own root schema rather than the step's control schema.
 */
export const mapSchemaErrorsToControlIssues = (
  errors: readonly ErrorObject[],
  { stepType, pathPrefix }: { stepType?: StepTypeEnum; pathPrefix?: string } = {}
): ControlIssues => {
  // First pass: identify URL fields and collect errors
  const urlFieldErrors = new Map<string, ErrorObject[]>();
  const otherErrors: Array<{ error: ErrorObject; path: string }> = [];

  for (const error of errors) {
    const errorPath = getErrorPath(error);
    const path = joinIssuePath(pathPrefix, errorPath);

    if (!path) {
      continue;
    }

    if (isUrlFieldError(errorPath, error.instancePath || '')) {
      urlFieldErrors.set(path, [...(urlFieldErrors.get(path) ?? []), error]);
    } else {
      otherErrors.push({ error, path });
    }
  }

  // Second pass: build issues object
  const controls: Record<string, RuntimeIssue[]> = {};

  // For URL fields, only keep one error (prefer anyOf, then first pattern error)
  // anyOf errors are preferred because they represent the union validation failure,
  // which is more accurate than individual pattern failures
  for (const [path, fieldErrors] of urlFieldErrors.entries()) {
    const anyOfError = fieldErrors.find((e) => e.keyword === 'anyOf');
    const errorToUse = anyOfError || fieldErrors[0];
    controls[path] = [
      {
        message: mapAjvErrorToMessage(errorToUse, stepType),
        issueType: mapAjvErrorToIssueType(errorToUse, true),
        variableName: path,
      },
    ];
  }

  // Add all other errors
  for (const { error, path } of otherErrors) {
    if (!controls[path]) {
      controls[path] = [];
    }
    controls[path].push({
      message: mapAjvErrorToMessage(error, stepType),
      issueType: mapAjvErrorToIssueType(error),
      variableName: path,
    });
  }

  return { controls };
};

export const processControlValuesBySchema = ({
  controlSchema,
  controlValues,
  stepType,
}: {
  controlSchema: JSONSchemaDto | undefined;
  controlValues: Record<string, unknown> | null;
  stepType?: StepTypeEnum;
}): ControlIssues => {
  if (!controlSchema || !controlValues) {
    return {};
  }

  const validate = createSchemaValidationAjv().compile(controlSchema);
  const isValid = validate(controlValues);
  const errors = validate.errors as null | ErrorObject[];

  if (isValid || !errors || errors.length === 0) {
    return {};
  }

  return mapSchemaErrorsToControlIssues(errors, { stepType });
};

const validateContentCompilation = (controlKey: string, currentValue: unknown): RuntimeIssue | null => {
  try {
    const parserEngine = buildLiquidParser();
    parserEngine.parse(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue));

    return null;
  } catch (error) {
    // @ts-expect-error - error is unknown
    const message = error.message ? error.message.split(', line:1')[0] || error.message.split(' line:1')[0] : '';

    return {
      message: `Content compilation error: ${message}`.trim(),
      issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
      variableName: controlKey,
    };
  }
};

export const processControlValuesByLiquid = ({
  currentValue,
  currentPath,
  issues,
  variableSchema,
}: {
  currentValue: unknown;
  currentPath: string[];
  issues: ControlIssues;
  variableSchema: JSONSchemaDto | undefined;
}) => {
  if (!currentValue || typeof currentValue !== 'object') {
    const liquidTemplateIssues = buildVariables({
      variableSchema,
      controlValue: currentValue,
      suggestPayloadNamespace: false,
    });

    // Prioritize invalid variable validation over content compilation since it provides more granular error details
    if (liquidTemplateIssues.invalidVariables.length > 0) {
      const controlKey = currentPath.join('.');

      issues.controls = issues.controls || {};

      issues.controls[controlKey] = liquidTemplateIssues.invalidVariables.map((invalidVariable) => {
        const message = invalidVariable.message ? invalidVariable.message.split(' line:')[0] : '';
        const variableName = invalidVariable.name === 'unknown' ? '{{}}' : invalidVariable.name;

        if ('filterMessage' in invalidVariable) {
          return {
            message: `Filter "${invalidVariable.filterMessage}" in "${variableName}"`,
            issueType: ContentIssueEnum.INVALID_FILTER_ARG_IN_VARIABLE,
            variableName: variableName,
          };
        }

        return {
          message: `Variable "${variableName}" ${message}`.trim(),
          issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE,
          variableName: variableName,
        };
      });
    } else {
      const contentControlKey = currentPath.join('.');
      const contentIssue = validateContentCompilation(contentControlKey, currentValue);
      if (contentIssue) {
        issues.controls = issues.controls || {};
        issues.controls[contentControlKey] = [contentIssue];

        return;
      }
    }

    return;
  }

  for (const [key, value] of Object.entries(currentValue)) {
    processControlValuesByLiquid({
      currentValue: value,
      currentPath: [...currentPath, key],
      issues,
      variableSchema,
    });
  }
};
