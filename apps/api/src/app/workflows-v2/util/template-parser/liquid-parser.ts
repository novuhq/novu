import { FILTER_VALIDATORS, LiquidFilterIssue } from '@novu/framework/internal';

import { Filter, Output, RenderError, Template, TokenKind } from 'liquidjs';
import {
  DIGEST_EVENTS_VARIABLE_PATTERN,
  extractLiquidExpressions,
  isLiquidErrors,
  isValidDynamicPath,
  isValidTemplate,
} from './parser-utils';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import type { VariableDetails, Variable } from './types';
import { buildLiquidParser } from './liquid-engine';

const parserEngine = buildLiquidParser();

/**
 * Parses a Liquid template string and extracts all variable names, including nested paths.
 * Validates the syntax and separates valid variables from invalid ones.
 *
 * @example
 * // Valid variables
 * parseLiquidVariables('Hello {{user.name}}, your score is {{user.score}}')
 * // Returns:
 * {
 *   validVariables: ['user.name', 'user.score'],
 *   invalidVariables: []
 * }
 *
 * @example
 * // Mixed valid and invalid syntax
 * parseLiquidVariables('{{user.name}} {{invalid..syntax}}')
 * // Returns:
 * {
 *   validVariables: ['user.name'],
 *   invalidVariables: [{
 *     context: '>> 1| {{invalid..syntax}}\n                ^',
 *     message: 'expected "|" before filter',
 *     variable: '{{invalid..syntax}}'
 *   }]
 * }
 *
 * @param template - The Liquid template string to parse
 * @param variableSchema - The schema to validate the variables against
 * @returns Object containing arrays of valid and invalid variables found in the template
 */
export function extractLiquidTemplateVariables({
  template,
  variableSchema,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
}): VariableDetails {
  if (!isValidTemplate(template)) {
    return { validVariables: [], invalidVariables: [] };
  }

  const liquidRawOutput = extractLiquidExpressions(template);
  if (liquidRawOutput.length === 0) {
    return { validVariables: [], invalidVariables: [] };
  }

  return processLiquidRawOutput({ rawOutputs: liquidRawOutput, variableSchema });
}

function processLiquidRawOutput({
  rawOutputs,
  variableSchema,
}: {
  rawOutputs: string[];
  variableSchema?: JSONSchemaDto;
}): VariableDetails {
  const validVariables: Array<Variable> = [];
  const invalidVariables: Array<Variable> = [];
  const processedVariables = new Set<string>();

  function addVariable(variable: Variable, isValid: boolean) {
    if (!processedVariables.has(variable.name)) {
      processedVariables.add(variable.name);
      (isValid ? validVariables : invalidVariables).push(variable);
    }
  }

  for (const rawOutput of rawOutputs) {
    try {
      const result = parseByLiquid({ rawOutput, variableSchema });
      result.validVariables.forEach((variable) => addVariable(variable, true));
      result.invalidVariables.forEach((variable) => addVariable(variable, false));
    } catch (error: unknown) {
      if (isLiquidErrors(error)) {
        error.errors.forEach((e: RenderError) => {
          addVariable(
            {
              name: rawOutput,
              message: e.message,
              context: e.context,
              output: rawOutput,
              outputStart: 0,
              outputEnd: rawOutput.length,
            },
            false
          );
        });
      }
    }
  }

  return { validVariables, invalidVariables };
}

function isPropertyAllowed(schema: JSONSchemaDto | undefined, propertyPath: string) {
  if (!schema) {
    return true;
  }

  let currentSchema = { ...schema };
  if (typeof currentSchema !== 'object') {
    return false;
  }

  const pathParts = propertyPath
    .split('.')
    .map((part) => {
      // Split array notation into [propName, index]
      const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);

      return arrayMatch ? [arrayMatch[1], arrayMatch[2]] : [part];
    })
    .flat();

  for (const part of pathParts) {
    const { properties, additionalProperties, type } = currentSchema;

    // Handle direct property access
    if (properties?.[part]) {
      currentSchema = properties[part] as JSONSchemaDto;
      continue;
    }

    // Handle array paths - valid if schema is array type
    if (type === 'array') {
      // Valid array index or property access
      const isArrayIndex = !Number.isNaN(Number(part)) && Number(part) >= 0;
      const arrayItemSchema = currentSchema.items as Record<string, unknown>;

      if (isArrayIndex) {
        currentSchema = arrayItemSchema;
        continue;
      }

      if (arrayItemSchema?.properties?.[part]) {
        currentSchema = arrayItemSchema.properties[part];
        continue;
      }
    }

    if (additionalProperties === true) {
      return true;
    }

    return false;
  }

  return true;
}

function parseByLiquid({
  rawOutput,
  variableSchema,
}: {
  rawOutput: string;
  variableSchema?: JSONSchemaDto;
}): VariableDetails {
  const validVariables: Array<Variable> = [];
  const invalidVariables: Array<Variable> = [];
  const parsed = parserEngine.parse(rawOutput);

  parsed
    .filter((template: Template) => isOutputToken(template))
    .forEach((template: Template) => {
      const result = extractProps(template);
      const variableName = buildVariable(result.props);
      const isDigestEventsVariable = !!variableName.match(/^steps\..+\.events$/);
      const filters = extractFilters(template);
      const filterIssues = validateFilters(filters, isDigestEventsVariable);
      const hasValidFilters = filterIssues.length === 0;

      if (!hasValidFilters) {
        const token = template?.token;
        invalidVariables.push({
          name: token?.input,
          filterMessage: filterIssues[0].message,
          output: rawOutput,
          outputStart: 0,
          outputEnd: rawOutput.length,
        });

        return;
      }

      const isValidVariable = result.valid && result.props.length > 0;
      if (isValidVariable) {
        const isAllowedVariable = isPropertyAllowed(variableSchema, variableName);
        if (isAllowedVariable) {
          validVariables.push({ name: variableName, output: rawOutput, outputStart: 0, outputEnd: rawOutput.length });
          if (filters.length > 0) {
            filters.forEach((filter) => {
              const { args } = filter;
              const firstArg = args[0];
              if (
                filter.name === 'toSentence' &&
                args.length > 0 &&
                'content' in firstArg &&
                typeof firstArg.content === 'string'
              ) {
                /**
                 * Check if the parent variable with the first argument is allowed
                 * basically forcing it to check if additionalProperties is true by checking for final variable name
                 * and if the parent variable is a valid dynamic path as variableSchema can be undefined.
                 * OR
                 * Check if the variable is a digest events array variable
                 * and the first argument starts with payload.
                 */
                if (
                  (isValidDynamicPath(variableName) &&
                    isPropertyAllowed(variableSchema, `${variableName}.${firstArg.content}`)) ||
                  (firstArg.content.startsWith('payload.') && DIGEST_EVENTS_VARIABLE_PATTERN.test(variableName))
                ) {
                  const isFirstArgValid = isPropertyAllowed(variableSchema, firstArg.content);
                  if (isFirstArgValid) {
                    validVariables.push({
                      name: `${variableName}.${firstArg.content}`,
                      output: `{{${firstArg.content}}}`,
                      outputStart: 0,
                      outputEnd: rawOutput.length,
                    });
                  }
                }
              }
            });
          }
        } else {
          invalidVariables.push({
            name: variableName,
            message: 'is not supported',
            output: rawOutput,
            outputStart: 0,
            outputEnd: rawOutput.length,
          });
        }
      }

      if (!result.valid) {
        const token = template?.token;
        invalidVariables.push({
          name: token?.input,
          message: result.error,
          output: rawOutput,
          outputStart: 0,
          outputEnd: rawOutput.length,
        });
      }
    });

  return { validVariables, invalidVariables };
}

const buildVariable = (parts: string[]) => {
  return parts.reduce((acc, prop, i) => {
    // if the prop is a number, preserve array notation (.[idx])
    if (typeof prop === 'number') {
      return `${acc}[${prop}]`;
    }

    return i === 0 ? prop : `${acc}.${prop}`;
  }, '');
};

function isOutputToken(template: Template): boolean {
  return template.token?.kind === TokenKind.Output;
}

function extractProps(template: any): { valid: boolean; props: string[]; error?: string } {
  const initial = template.value?.initial;
  if (!initial?.postfix?.[0]?.props) return { valid: true, props: [] };

  /**
   * If initial.postfix length is greater than 1, it means the variable contains spaces
   * which is not supported in Novu's variable syntax.
   *
   * Example:
   * Valid: {{user.firstName}}
   * Invalid: {{user.first name}} - postfix length would be 2 due to space
   */
  if (initial.postfix.length > 1) {
    return {
      valid: false,
      props: [],
      error: `contains whitespaces`,
    };
  }

  const validProps: string[] = [];

  for (const prop of initial.postfix[0].props) {
    validProps.push(prop.content);
  }

  /**
   * If validProps length is 1, it means the variable has no namespace which is not
   * supported in Novu's variable syntax. Variables must be namespaced.
   *
   * Example:
   * Valid: {{user.firstName}} - Has namespace 'user'
   * Invalid: {{firstName}} - No namespace
   */
  if (validProps.length === 1) {
    return {
      valid: false,
      props: [],
      error: `missing namespace. Did you mean {{payload.${validProps[0] === 'payload' ? 'someKey' : validProps[0]}}}?`,
    };
  }

  return { valid: true, props: validProps };
}

function extractFilters(template: Template): Filter[] {
  if (template instanceof Output) {
    return template.value.filters;
  }

  return [];
}

function validateFilters(filters: Filter[], isDigestEventsVariable: boolean): LiquidFilterIssue[] {
  return filters.reduce((acc, filter) => {
    const validator = FILTER_VALIDATORS[filter.name];
    if (!validator) return acc;

    let args: unknown[] = [...filter.args];
    if (filter.name === 'toSentence') {
      args = [{ requireKeyPath: isDigestEventsVariable }, ...filter.args];
    }

    const filterIssues = validator(...args);

    return [...acc, ...filterIssues];
  }, []);
}
