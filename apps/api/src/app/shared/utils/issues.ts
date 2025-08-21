import { ContentIssueEnum, RuntimeIssue, StepTypeEnum } from '@novu/shared';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { capitalize } from '../services/helper/helper.service';
import { buildVariables } from './build-variables';
import { buildLiquidParser } from './template-parser/liquid-engine';

const getErrorPath = (error: ErrorObject): string => {
  const path = error.instancePath.substring(1);
  const { missingProperty } = error.params;

  if (!path || path.trim().length === 0) {
    return missingProperty;
  }

  const fullPath = missingProperty ? `${path}/${missingProperty}` : path;

  return fullPath?.replace(/\//g, '.');
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
  if (
    error.keyword === 'pattern' &&
    error.message?.includes('must match pattern') &&
    error.message?.includes('mailto') &&
    error.message?.includes('https')
  ) {
    return `Invalid URL. Must be a valid full URL, path starting with /, or {{variable}}`;
  }

  return error.message || 'Invalid value';
};

const mapAjvErrorToIssueType = (error: ErrorObject): ContentIssueEnum => {
  switch (error.keyword) {
    case 'required':
      return ContentIssueEnum.MISSING_VALUE;
    case 'type':
      return ContentIssueEnum.MISSING_VALUE;
    default:
      return ContentIssueEnum.MISSING_VALUE;
  }
};

export type ControlIssues = {
  controls?: Record<string, RuntimeIssue[]>;
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
  let issues: ControlIssues = {};

  if (!controlSchema || !controlValues) {
    return issues;
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(controlSchema);
  const isValid = validate(controlValues);
  const errors = validate.errors as null | ErrorObject[];

  if (!isValid && errors && errors?.length !== 0 && controlValues) {
    issues = {
      controls: errors.reduce(
        (acc, error) => {
          const path = getErrorPath(error);
          if (!acc[path]) {
            acc[path] = [];
          }
          acc[path].push({
            message: mapAjvErrorToMessage(error, stepType),
            issueType: mapAjvErrorToIssueType(error),
            variableName: path,
          });

          return acc;
        },
        {} as Record<string, RuntimeIssue[]>
      ),
    };

    return issues;
  }

  return issues;
};

const validateContentCompilation = (controlKey: string, currentValue: unknown): RuntimeIssue | null => {
  try {
    const parserEngine = buildLiquidParser();
    parserEngine.parse(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue));

    return null;
  } catch (error) {
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
