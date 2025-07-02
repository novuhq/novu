import { FILTER_VALIDATORS, LiquidFilterIssue } from '@novu/framework/internal';

import {
  AssignTag,
  CaptureTag,
  CaseTag,
  Filter,
  ForTag,
  IfTag,
  Output,
  RenderError,
  TablerowTag,
  Tag,
  Template,
  TokenKind,
  UnlessTag,
  LiquidError,
} from 'liquidjs';
import { DIGEST_EVENTS_VARIABLE_PATTERN, isLiquidErrors, isValidDynamicPath, isValidTemplate } from './parser-utils';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import type { ProcessContext, VariableDetails, Variable } from './types';
import { buildLiquidParser } from './liquid-engine';

const parserEngine = buildLiquidParser();

/**
 * Parses a Liquid template string and extracts all variable names, including nested, variables used in the tags and conditions.
 * Validates the syntax and separates valid variables from invalid ones based on the variable schema.
 * The local variables are not added to the valid variables, for example iterator variables, because they are not part of the schema.
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

  return processLiquidRawOutput({ template, variableSchema });
}

function processLiquidRawOutput({
  template,
  variableSchema,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
}): VariableDetails {
  const validVariables: Array<Variable> = [];
  const invalidVariables: Array<Variable> = [];
  const processedOutputs = new Set<string>();

  function addVariable(variable: Variable, isValid: boolean) {
    if (!processedOutputs.has(variable.name)) {
      processedOutputs.add(variable.name);
      (isValid ? validVariables : invalidVariables).push(variable);
    }
  }

  try {
    const result = parseByLiquid({ template, variableSchema });
    result.validVariables.forEach((variable) => addVariable(variable, true));
    result.invalidVariables.forEach((variable) => addVariable(variable, false));
  } catch (error: unknown) {
    if (isLiquidErrors(error)) {
      error.errors.forEach((e: RenderError) => {
        const { token } = e;
        if (token) {
          addVariable(
            {
              name: extractVariableFromOutput(token.input) || 'unknown',
              message: e.message,
              context: e.context,
              output: token.input,
              outputStart: token.begin,
              outputEnd: token.end,
            },
            false
          );
        }
      });
    } else if (error instanceof LiquidError) {
      const { token } = error as any;
      if (token) {
        addVariable(
          {
            name: extractVariableFromOutput(token.input) || 'unknown',
            message: error.message,
            output: token.input,
            outputStart: token.begin,
            outputEnd: token.end,
          },
          false
        );
      }
    }
  }

  return { validVariables, invalidVariables };
}

function parseByLiquid({
  template,
  variableSchema,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
}): VariableDetails {
  const validVariables: Array<Variable> = [];
  const invalidVariables: Array<Variable> = [];
  const parsed = parserEngine.parse(template);

  processTemplates({
    templates: parsed,
    validVariables,
    invalidVariables,
    variableSchema,
    localVariables: new Set(),
  });

  return { validVariables, invalidVariables };
}

function processTemplates(context: ProcessContext) {
  const { templates, validVariables, invalidVariables, variableSchema, localVariables = new Set() } = context;

  templates.forEach((template: Template) => {
    if (isOutputToken(template)) {
      validateOutputToken({
        template,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    } else if (isTagToken(template)) {
      processTagToken({
        template,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    }
  });
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

function validateVariable({
  variableName,
  validVariables,
  invalidVariables,
  variableSchema,
  localVariables,
  output,
  outputStart,
  outputEnd,
}: {
  variableName: string;
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
  output: string;
  outputStart: number;
  outputEnd: number;
}) {
  // Check if this variable has no namespace (single part)
  const hasNoNamespace = variableName.split('.').length === 1;
  const isNotStepVariable =
    !hasNoNamespace && !isValidDynamicPath(variableName) && !DIGEST_EVENTS_VARIABLE_PATTERN.test(variableName);
  const isLocalVariable = Array.from(localVariables).some(
    (localVar) => variableName === localVar || variableName.startsWith(`${localVar}.`)
  );
  if (isLocalVariable) {
    return;
  }

  if (hasNoNamespace || (!variableSchema && isNotStepVariable)) {
    // Otherwise, it's invalid (missing namespace)
    invalidVariables.push({
      name: variableName,
      message: `missing namespace. Did you mean {{payload.${variableName}}}?`,
      output,
      outputStart,
      outputEnd,
    });

    return;
  }

  const isAllowedVariable = isPropertyAllowed(variableSchema, variableName);
  if (isAllowedVariable) {
    validVariables.push({
      name: variableName,
      output,
      outputStart,
      outputEnd,
    });
  } else {
    invalidVariables.push({
      name: variableName,
      message: 'is not supported',
      output,
      outputStart,
      outputEnd,
    });
  }
}

function validateOutputToken({
  template,
  validVariables,
  invalidVariables,
  variableSchema,
  localVariables,
}: {
  template: Template;
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
}) {
  const result = extractProps(template);
  const variableName = buildVariable(result.props);
  const { token } = template;
  const outputStart = token.begin;
  const outputEnd = token.end;
  const output = token.input.slice(outputStart, outputEnd);

  if (!result.valid) {
    invalidVariables.push({
      name: variableName || output,
      message: result.error,
      output,
      outputStart,
      outputEnd,
    });

    return;
  }

  const isDigestEventsVariable = !!variableName.match(/^steps\..+\.events$/);
  const filters = extractFilters(template);
  const filterIssues = validateFilters(filters, isDigestEventsVariable);
  const hasValidFilters = filterIssues.length === 0;

  if (!hasValidFilters) {
    invalidVariables.push({
      name: variableName,
      filterMessage: filterIssues[0].message,
      output,
      outputStart,
      outputEnd,
    });

    return;
  }

  // Handle filter arguments (like toSentence)
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
              output: firstArg.content,
              outputStart,
              outputEnd,
            });
          } else {
            invalidVariables.push({
              name: `${variableName}.${firstArg.content}`,
              message: 'is not supported',
              output: firstArg.content,
              outputStart,
              outputEnd,
            });
          }
        }
      }
    });
  }

  validateVariable({
    variableName,
    validVariables,
    invalidVariables,
    variableSchema,
    localVariables,
    output,
    outputStart,
    outputEnd,
  });
}

function processTagToken({
  template,
  validVariables,
  invalidVariables,
  variableSchema,
  localVariables,
}: {
  template: Tag;
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
}) {
  const { token } = template;
  const outputStart = token.begin;
  const outputEnd = token.end;
  const output = token.input.slice(outputStart, outputEnd);

  if (template instanceof ForTag) {
    // Extract iterator variable from token content: {% for item in collection %}
    const forMatch = output.match(/^\s*{%\s*for\s+(\w+)\s+in\s+(.+?)\s*%}/);
    if (forMatch) {
      const [, iteratorVariable, collectionExpression] = forMatch;

      // Check if it's a range expression
      if (collectionExpression.trim().match(/^\(.+?\.\..+?\)$/)) {
        // Extract variables from range
        const rangeVariables = extractVariablesFromRange(collectionExpression.trim());
        rangeVariables.forEach((variableName) => {
          validateVariable({
            variableName,
            validVariables,
            invalidVariables,
            variableSchema,
            localVariables,
            output,
            outputStart,
            outputEnd,
          });
        });
      } else {
        // Extract collection variable (non-range)
        const collectionVariable = extractVariableFromExpression(collectionExpression);
        if (collectionVariable) {
          validateVariable({
            variableName: collectionVariable,
            validVariables,
            invalidVariables,
            variableSchema,
            localVariables,
            output,
            outputStart,
            outputEnd,
          });
        }
      }

      const newLocalVariables = new Set(localVariables);
      newLocalVariables.add(iteratorVariable);
      newLocalVariables.add('forloop'); // Add forloop built-in variable

      // process nested templates with new local variables
      processTemplates({
        templates: (template as any).templates || [],
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables: newLocalVariables,
      });
    }
  } else if (template instanceof IfTag || template instanceof UnlessTag) {
    // Extract variables from condition
    const tagName = template instanceof IfTag ? 'if' : 'unless';
    const conditionMatch = output.match(new RegExp(`^\\s*{%\\s*${tagName}\\s+(.+?)\\s*%}`));
    if (conditionMatch) {
      const condition = conditionMatch[1];
      const variables = extractVariablesFromCondition(condition);

      variables.forEach((variableName) => {
        validateVariable({
          variableName,
          validVariables,
          invalidVariables,
          variableSchema,
          localVariables,
          output,
          outputStart,
          outputEnd,
        });
      });
    }

    // Process branches
    const branches = (template as any).branches || [];
    for (const branch of branches) {
      // Extract variables from branch condition (elsif conditions)
      if (branch.value) {
        const branchVariables = extractVariablesFromValue(branch.value);
        branchVariables.forEach((variableName) => {
          validateVariable({
            variableName,
            validVariables,
            invalidVariables,
            variableSchema,
            localVariables,
            output: variableName, // Using variable name as output since we don't have the exact token
            outputStart: 0,
            outputEnd: variableName.length,
          });
        });
      }

      processTemplates({
        templates: branch.templates || [],
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    }

    // Process else templates
    const elseTemplates = (template as any).elseTemplates || [];
    if (elseTemplates.length > 0) {
      processTemplates({
        templates: elseTemplates,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    }
  } else if (template instanceof AssignTag) {
    // Extract assigned variable from token content: {% assign myVar = value %}
    const assignMatch = output.match(/^\s*{%\s*assign\s+(\w+)\s*=\s*(.+?)\s*%}/);
    if (assignMatch) {
      const [, assignedVariable, valueExpression] = assignMatch;

      // Add to local variables BEFORE processing the value expression
      const newLocalVariables = new Set(localVariables);
      newLocalVariables.add(assignedVariable);

      // Extract variables from value expression
      const variables = extractVariablesFromCondition(valueExpression);
      variables.forEach((variableName) => {
        validateVariable({
          variableName,
          validVariables,
          invalidVariables,
          variableSchema,
          localVariables: newLocalVariables, // Use the new set with the assigned variable
          output,
          outputStart,
          outputEnd,
        });
      });

      // Update the original set
      localVariables.add(assignedVariable);
    }
  } else if (template instanceof CaptureTag) {
    // Extract captured variable: {% capture myVar %}...{% endcapture %}
    const captureMatch = output.match(/^\s*{%\s*capture\s+(\w+)\s*%}/);
    if (captureMatch) {
      const capturedVariable = captureMatch[1];

      // Add to local variables BEFORE processing the content
      const newLocalVariables = new Set(localVariables);
      newLocalVariables.add(capturedVariable);

      // Process captured content
      const templates = (template as any).templates || [];
      processTemplates({
        templates,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables: newLocalVariables,
      });

      // Update the original set
      localVariables.add(capturedVariable);
    }
  } else if (template instanceof TablerowTag) {
    // Similar to for loop - also needs range handling
    const tablerowMatch = output.match(/^\s*{%\s*tablerow\s+(\w+)\s+in\s+(.+?)\s*%}/);
    if (tablerowMatch) {
      const [, iteratorVariable, collectionExpression] = tablerowMatch;

      // Check if it's a range expression
      if (collectionExpression.trim().match(/^\(.+?\.\..+?\)$/)) {
        // Extract variables from range
        const rangeVariables = extractVariablesFromRange(collectionExpression.trim());
        rangeVariables.forEach((variableName) => {
          validateVariable({
            variableName,
            validVariables,
            invalidVariables,
            variableSchema,
            localVariables,
            output,
            outputStart,
            outputEnd,
          });
        });
      } else {
        // Extract collection variable (non-range)
        const collectionVariable = extractVariableFromExpression(collectionExpression);
        if (collectionVariable) {
          validateVariable({
            variableName: collectionVariable,
            validVariables,
            invalidVariables,
            variableSchema,
            localVariables,
            output,
            outputStart,
            outputEnd,
          });
        }
      }

      // Process nested templates with new local variables
      const newLocalVariables = new Set(localVariables);
      newLocalVariables.add(iteratorVariable);
      newLocalVariables.add('tablerowloop'); // Add tablerowloop built-in variable

      const templates = (template as any).templates || [];
      processTemplates({
        templates,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables: newLocalVariables,
      });
    }
  } else if (template instanceof CaseTag) {
    // Extract case variable: {% case variable %}
    const caseMatch = output.match(/^\s*{%\s*case\s+(.+?)\s*%}/);
    if (caseMatch) {
      const caseExpression = caseMatch[1];

      // Extract variables from the case expression
      const variables = extractVariablesFromCondition(caseExpression);
      variables.forEach((variableName) => {
        validateVariable({
          variableName,
          validVariables,
          invalidVariables,
          variableSchema,
          localVariables,
          output,
          outputStart,
          outputEnd,
        });
      });
    }

    // Process branches (when clauses)
    const branches = (template as any).branches || [];
    for (const branch of branches) {
      // Extract variables from when values if they exist
      if (branch.values) {
        branch.values.forEach((valueToken: any) => {
          // Check if the value token is a variable (not a literal)
          if (valueToken.kind === TokenKind.PropertyAccess || valueToken.kind === TokenKind.Word) {
            const variableName = valueToken.input.slice(valueToken.begin, valueToken.end).trim();
            if (variableName && /^[a-zA-Z_]/.test(variableName)) {
              // Ensure it starts with a letter
              validateVariable({
                variableName,
                validVariables,
                invalidVariables,
                variableSchema,
                localVariables,
                output: variableName,
                outputStart: valueToken.begin,
                outputEnd: valueToken.end,
              });
            }
          }
        });
      }

      // Process templates within this when branch
      processTemplates({
        templates: branch.templates || [],
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    }

    // Process else templates
    const elseTemplates = (template as any).elseTemplates || [];
    if (elseTemplates.length > 0) {
      processTemplates({
        templates: elseTemplates,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
      });
    }
  }
  // Add more tag types as needed
}

function extractVariableFromOutput(output: string): string | null {
  const cleanOutput = output.trim().replace(/^{{/, '').replace(/}}$/, '');

  return extractVariableFromExpression(cleanOutput);
}

function extractVariableFromExpression(expression: string): string | null {
  // Remove filters if any (everything after |)
  const cleanExpression = expression.split('|')[0].trim();

  // Check for range syntax (start..end)
  const rangeMatch = cleanExpression.match(/^\((.+?)\.\.(.+?)\)$/);
  if (rangeMatch) {
    // This is a range, we'll handle it in extractVariablesFromRange
    return null;
  }

  // Match simple variable patterns
  const match = cleanExpression.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\[\d+\])*)$/);

  return match ? match[1] : null;
}

function extractVariablesFromRange(rangeExpression: string): string[] {
  const variables: string[] = [];

  // Match range syntax (start..end)
  const rangeMatch = rangeExpression.match(/^\((.+?)\.\.(.+?)\)$/);
  if (rangeMatch) {
    const [, start, end] = rangeMatch;

    // Extract variables from start
    if (!/^\d+$/.test(start.trim())) {
      // Not a pure number
      const startVars = extractVariablesFromCondition(start);
      variables.push(...startVars);
    }

    // Extract variables from end
    if (!/^\d+$/.test(end.trim())) {
      // Not a pure number
      const endVars = extractVariablesFromCondition(end);
      variables.push(...endVars);
    }
  }

  return variables;
}

function extractVariablesFromCondition(condition: string): string[] {
  const variables: string[] = [];

  // First, temporarily replace string literals with placeholders to avoid matching their contents
  let processedCondition = condition;
  const stringLiterals: string[] = [];

  // Replace all string literals (both single and double quoted) with placeholders
  processedCondition = processedCondition.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    stringLiterals.push(match);

    return `__STRING_LITERAL_${stringLiterals.length - 1}__`;
  });

  // Now match variable patterns from the processed condition
  const variableMatches = processedCondition.match(/[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\[\d+\])*/g);

  if (variableMatches) {
    variables.push(
      ...variableMatches.filter(
        (variable) =>
          // Filter out common keywords/operators
          ![
            'true',
            'false',
            'null',
            'nil',
            'and',
            'or',
            'not',
            'contains',
            'eq',
            'ne',
            'lt',
            'le',
            'gt',
            'ge',
          ].includes(variable.toLowerCase()) &&
          // Filter out our placeholder patterns
          !variable.startsWith('__STRING_LITERAL_')
      )
    );
  }

  return [...new Set(variables)]; // Remove duplicates
}

function isTagToken(template: Template): template is Tag {
  return template.token?.kind === TokenKind.Tag;
}

const buildVariable = (parts: string[]) => {
  if (parts.length === 0) return '';

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

  // Handle case where there's no initial value
  if (!initial) {
    return { valid: true, props: [] };
  }

  // If it's a simple word without namespace
  if (initial.kind === TokenKind.Word && !initial.postfix?.length) {
    // Return the word as a single prop (no namespace)
    return {
      valid: true,
      props: [initial.content],
      error: undefined, // We'll handle namespace validation in processOutputToken
    };
  }

  if (!initial?.postfix?.[0]?.props) {
    // Single variable without properties
    if (initial.content) {
      return {
        valid: true,
        props: [initial.content],
        error: undefined,
      };
    }

    return { valid: true, props: [] };
  }

  /**
   * If initial.postfix length is greater than 1, it means the variable contains spaces
   * which is not supported in Novu's variable syntax.
   */
  if (initial.postfix.length > 1) {
    return {
      valid: false,
      props: [],
      error: `contains whitespaces`,
    };
  }

  const validProps: string[] = [];

  // Add the initial identifier/word
  if (initial.content) {
    validProps.push(initial.content);
  }

  for (const prop of initial.postfix[0].props) {
    validProps.push(prop.content);
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
  }, [] as LiquidFilterIssue[]);
}

function extractVariablesFromValue(value: any): string[] {
  const variables: string[] = [];

  function processValue(val: any) {
    if (!val) return;

    // If it has an initial property, it's likely a variable reference
    if (val.initial) {
      const varName = buildVariableFromValue(val);
      if (varName) {
        variables.push(varName);
      }
    }

    // Process operands for binary expressions
    if (val.lhs) processValue(val.lhs);
    if (val.rhs) processValue(val.rhs);

    // Process array/object values
    if (Array.isArray(val)) {
      val.forEach(processValue);
    }
  }

  processValue(value);

  return variables;
}

function buildVariableFromValue(value: any): string | null {
  if (!value?.initial) return null;

  const parts: string[] = [];

  // Add initial content
  if (value.initial.content) {
    parts.push(value.initial.content);
  }

  // Add postfix properties
  if (value.initial.postfix?.[0]?.props) {
    for (const prop of value.initial.postfix[0].props) {
      parts.push(prop.content);
    }
  }

  return parts.length > 0 ? buildVariable(parts) : null;
}
