import { FILTER_VALIDATORS, LiquidFilterIssue } from '@novu/framework/internal';
import { LAYOUT_CONTENT_VARIABLE, TRANSLATION_NAMESPACE_SEPARATOR } from '@novu/shared';
import {
  AssignTag,
  CaptureTag,
  CaseTag,
  Filter,
  ForTag,
  IfTag,
  LiquidError,
  Output,
  RenderError,
  TablerowTag,
  Tag,
  Template,
  TokenKind,
  UnlessTag,
} from 'liquidjs';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { buildLiquidParser } from './liquid-engine';
import { DIGEST_EVENTS_VARIABLE_PATTERN, isLiquidErrors, isValidDynamicPath, isValidTemplate } from './parser-utils';
import type { ProcessContext, Variable, VariableDetails } from './types';

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
  suggestPayloadNamespace = true,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
  suggestPayloadNamespace?: boolean;
}): VariableDetails {
  if (!isValidTemplate(template)) {
    return { validVariables: [], invalidVariables: [] };
  }

  return processLiquidRawOutput({ template, variableSchema, suggestPayloadNamespace });
}

function processLiquidRawOutput({
  template,
  variableSchema,
  suggestPayloadNamespace = true,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
  suggestPayloadNamespace?: boolean;
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
    const result = parseByLiquid({ template, variableSchema, suggestPayloadNamespace });
    result.validVariables.forEach((variable) => {
      addVariable(variable, true);
    });
    result.invalidVariables.forEach((variable) => {
      addVariable(variable, false);
    });
  } catch (error: unknown) {
    if (isLiquidErrors(error)) {
      error.errors.forEach((e: RenderError) => {
        const { token } = e;
        if (token) {
          addVariable(variableFromParseError(token, e.message, e.context), false);
        }
      });
    } else if (error instanceof LiquidError) {
      const { token } = error;
      if (token) {
        addVariable(variableFromParseError(token, error.message), false);
      }
    }
  }

  return { validVariables, invalidVariables };
}

function parseByLiquid({
  template,
  variableSchema,
  suggestPayloadNamespace = true,
}: {
  template: string;
  variableSchema?: JSONSchemaDto;
  suggestPayloadNamespace?: boolean;
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
    suggestPayloadNamespace,
  });

  return { validVariables, invalidVariables };
}

function processTemplates(context: ProcessContext) {
  const {
    templates,
    validVariables,
    invalidVariables,
    variableSchema,
    localVariables = new Set(),
    suggestPayloadNamespace,
  } = context;

  templates.forEach((template: Template) => {
    if (isOutputToken(template)) {
      validateOutputToken({
        template,
        validVariables,
        invalidVariables,
        variableSchema,
        localVariables,
        suggestPayloadNamespace,
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

  const pathParts = propertyPath.split('.').flatMap((part) => {
    // Split array notation into [propName, index]
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);

    return arrayMatch ? [arrayMatch[1], arrayMatch[2]] : [part];
  });

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

    // Check if additionalProperties is a schema object (for complex schemas)
    if (typeof additionalProperties === 'object' && additionalProperties !== null) {
      // Set the current schema to the additionalProperties schema and continue validation
      currentSchema = additionalProperties as JSONSchemaDto;
      continue;
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
  suggestPayloadNamespace,
}: {
  variableName: string;
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
  output: string;
  outputStart: number;
  outputEnd: number;
  suggestPayloadNamespace?: boolean;
}) {
  // Check if this variable has no namespace (single part)
  const hasNoNamespace = variableName.split('.').length === 1;
  const isNotStepVariable =
    !hasNoNamespace && !isValidDynamicPath(variableName) && !DIGEST_EVENTS_VARIABLE_PATTERN.test(variableName);
  const isLocalVariable = Array.from(localVariables).some(
    (localVar) => variableName === localVar || variableName.startsWith(`${localVar}.`)
  );

  const isAllowedVariable = isPropertyAllowed(variableSchema, variableName);
  const isContentVariable = variableName === LAYOUT_CONTENT_VARIABLE && isAllowedVariable;
  const isTranslationVariable = variableName.startsWith(TRANSLATION_NAMESPACE_SEPARATOR);

  if (isLocalVariable) {
    return;
  }

  if ((hasNoNamespace && !isContentVariable) || (!variableSchema && isNotStepVariable)) {
    // Otherwise, it's invalid (missing namespace)
    invalidVariables.push({
      name: variableName,
      message: suggestPayloadNamespace
        ? `invalid or missing namespace. Did you mean {{payload.${variableName}}}?`
        : 'invalid or missing namespace',
      output,
      outputStart,
      outputEnd,
    });

    return;
  }

  if (isAllowedVariable || isTranslationVariable) {
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
  suggestPayloadNamespace,
}: {
  template: Template;
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
  suggestPayloadNamespace?: boolean;
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
    suggestPayloadNamespace,
  });
}

type TagScan = {
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables: Set<string>;
  output: string;
  outputStart: number;
  outputEnd: number;
};

function validateParsedNames(
  variableNames: string[],
  scan: TagScan,
  location?: { output: string; outputStart: number; outputEnd: number }
) {
  const output = location?.output ?? scan.output;
  const outputStart = location?.outputStart ?? scan.outputStart;
  const outputEnd = location?.outputEnd ?? scan.outputEnd;

  for (const variableName of variableNames) {
    validateVariable({
      variableName,
      validVariables: scan.validVariables,
      invalidVariables: scan.invalidVariables,
      variableSchema: scan.variableSchema,
      localVariables: scan.localVariables,
      output,
      outputStart,
      outputEnd,
    });
  }
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
  const scan: TagScan = {
    validVariables,
    invalidVariables,
    variableSchema,
    localVariables,
    output: token.input.slice(token.begin, token.end),
    outputStart: token.begin,
    outputEnd: token.end,
  };

  if (template instanceof ForTag) {
    processLoopTag(scan, template, 'for', 'forloop');

    return;
  }

  if (template instanceof TablerowTag) {
    processLoopTag(scan, template, 'tablerow', 'tablerowloop');

    return;
  }

  if (template instanceof IfTag || template instanceof UnlessTag) {
    processConditionalTag(scan, template);

    return;
  }

  if (template instanceof AssignTag) {
    processAssignTag(scan);

    return;
  }

  if (template instanceof CaptureTag) {
    processCaptureTag(scan, template);

    return;
  }

  if (template instanceof CaseTag) {
    processCaseTag(scan, template);
  }
}

function processLoopTag(
  scan: TagScan,
  template: ForTag | TablerowTag,
  tagName: 'for' | 'tablerow',
  loopVariable: string
) {
  const loopMatch = scan.output.match(new RegExp(`^\\s*{%\\s*${tagName}\\s+(\\w+)\\s+in\\s+(.+?)\\s*%}`));
  if (!loopMatch) {
    return;
  }

  const [, iteratorVariable, collectionExpression] = loopMatch;
  const isRangeExpression = collectionExpression.trim().match(/^\(.+?\.\..+?\)$/);

  if (isRangeExpression) {
    validateParsedNames(extractVariablesFromRange(collectionExpression.trim()), scan);
  } else {
    const collectionVariable = extractVariableFromExpression(collectionExpression);
    if (collectionVariable) {
      validateParsedNames([collectionVariable], scan);
    }
  }

  const newLocalVariables = new Set(scan.localVariables);
  newLocalVariables.add(iteratorVariable);
  newLocalVariables.add(loopVariable);

  const nestedTemplates = template.templates || [];
  processTemplates({
    templates: nestedTemplates,
    validVariables: scan.validVariables,
    invalidVariables: scan.invalidVariables,
    variableSchema: scan.variableSchema,
    localVariables: newLocalVariables,
  });

  if (!isRangeExpression) {
    const collectionVar = extractVariableFromExpression(collectionExpression);
    annotateCollectionVariable(
      iteratorVariable,
      collectionVar,
      nestedTemplates,
      scan.validVariables,
      scan.invalidVariables
    );
  }
}

function processConditionalTag(scan: TagScan, template: IfTag | UnlessTag) {
  const tagName = template instanceof IfTag ? 'if' : 'unless';
  const conditionMatch = scan.output.match(new RegExp(`^\\s*{%\\s*${tagName}\\s+(.+?)\\s*%}`));
  if (conditionMatch) {
    validateParsedNames(extractVariablesFromCondition(conditionMatch[1]), scan);
  }

  for (const branch of template.branches) {
    if (branch.value) {
      for (const variableName of extractVariablesFromValue(branch.value)) {
        validateParsedNames([variableName], scan, {
          output: variableName,
          outputStart: 0,
          outputEnd: variableName.length,
        });
      }
    }

    processTemplates({
      templates: branch.templates || [],
      validVariables: scan.validVariables,
      invalidVariables: scan.invalidVariables,
      variableSchema: scan.variableSchema,
      localVariables: scan.localVariables,
    });
  }

  const elseTemplates = template.elseTemplates || [];
  if (elseTemplates.length > 0) {
    processTemplates({
      templates: elseTemplates,
      validVariables: scan.validVariables,
      invalidVariables: scan.invalidVariables,
      variableSchema: scan.variableSchema,
      localVariables: scan.localVariables,
    });
  }
}

function processAssignTag(scan: TagScan) {
  const assignMatch = scan.output.match(/^\s*{%-?\s*assign\s+(\w+)\s*=\s*(.+?)\s*-?%}/);
  if (!assignMatch) {
    return;
  }

  const [, assignedVariable, valueExpression] = assignMatch;
  const newLocalVariables = new Set(scan.localVariables);
  newLocalVariables.add(assignedVariable);

  validateParsedNames(extractVariablesFromCondition(valueExpression), {
    ...scan,
    localVariables: newLocalVariables,
  });
  scan.localVariables.add(assignedVariable);
}

function processCaptureTag(scan: TagScan, template: CaptureTag) {
  const captureMatch = scan.output.match(/^\s*{%\s*capture\s+(\w+)\s*%}/);
  if (!captureMatch) {
    return;
  }

  const capturedVariable = captureMatch[1];
  const newLocalVariables = new Set(scan.localVariables);
  newLocalVariables.add(capturedVariable);

  processTemplates({
    templates: template.templates || [],
    validVariables: scan.validVariables,
    invalidVariables: scan.invalidVariables,
    variableSchema: scan.variableSchema,
    localVariables: newLocalVariables,
  });
  scan.localVariables.add(capturedVariable);
}

function processCaseTag(scan: TagScan, template: CaseTag) {
  const caseMatch = scan.output.match(/^\s*{%\s*case\s+(.+?)\s*%}/);
  if (caseMatch) {
    validateParsedNames(extractVariablesFromCondition(caseMatch[1]), scan);
  }

  for (const branch of template.branches) {
    if (branch.values) {
      for (const valueToken of branch.values) {
        if (valueToken.kind !== TokenKind.PropertyAccess && valueToken.kind !== TokenKind.Word) {
          continue;
        }

        const variableName = valueToken.input.slice(valueToken.begin, valueToken.end).trim();
        if (!variableName || !/^[a-zA-Z_]/.test(variableName)) {
          continue;
        }

        validateParsedNames([variableName], scan, {
          output: variableName,
          outputStart: valueToken.begin,
          outputEnd: valueToken.end,
        });
      }
    }

    processTemplates({
      templates: branch.templates || [],
      validVariables: scan.validVariables,
      invalidVariables: scan.invalidVariables,
      variableSchema: scan.variableSchema,
      localVariables: scan.localVariables,
    });
  }

  const elseTemplates = template.elseTemplates || [];
  if (elseTemplates.length > 0) {
    processTemplates({
      templates: elseTemplates,
      validVariables: scan.validVariables,
      invalidVariables: scan.invalidVariables,
      variableSchema: scan.variableSchema,
      localVariables: scan.localVariables,
    });
  }
}

function variableFromParseError(
  token: { input: string; begin: number; end: number },
  message: string,
  context?: string
): Variable {
  const extractedName = extractVariableFromOutput(token.input);
  const variable: Variable = {
    name: extractedName ?? 'unknown',
    message,
    output: token.input,
    outputStart: token.begin,
    outputEnd: token.end,
  };

  if (context) {
    variable.context = context;
  }

  if (!extractedName) {
    variable.isParseFailure = true;
  }

  return variable;
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

  // Strip filter segments to avoid treating filter names as variables
  processedCondition = processedCondition.replace(/\|\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\s*:[^|%}]*)?/g, '');

  // Now match variable patterns from the processed condition
  const variableMatches = processedCondition.match(/[a-zA-Z_][a-zA-Z0-9_[\].-]+/g);

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

const buildVariable = (parts: Array<string | number>): string => {
  return parts.reduce<string>((acc, prop) => {
    if (typeof prop === 'number') {
      return `${acc}[${prop}]`;
    }

    if (!acc) {
      return prop;
    }

    return `${acc}.${prop}`;
  }, '');
};

function isOutputToken(template: Template): boolean {
  return template.token?.kind === TokenKind.Output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  return typeof value === 'string' ? value : undefined;
}

function namePart(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return undefined;
}

function extractProps(template: Template): { valid: boolean; props: Array<string | number>; error?: string } {
  if (!(template instanceof Output)) {
    return { valid: true, props: [] };
  }

  const initial = template.value?.initial;
  if (!initial || !isRecord(initial)) {
    return { valid: true, props: [] };
  }

  const content = stringField(initial, 'content');
  const postfix = Array.isArray(initial.postfix) ? initial.postfix : [];

  if (initial.kind === TokenKind.Word && postfix.length === 0) {
    return {
      valid: true,
      props: content === undefined ? [] : [content],
      error: undefined,
    };
  }

  const firstPostfix = postfix[0];
  const props = isRecord(firstPostfix) && Array.isArray(firstPostfix.props) ? firstPostfix.props : undefined;

  if (!props) {
    if (content) {
      return {
        valid: true,
        props: [content],
        error: undefined,
      };
    }

    return { valid: true, props: [] };
  }

  if (postfix.length > 1) {
    return {
      valid: false,
      props: [],
      error: `contains whitespaces`,
    };
  }

  const validProps: Array<string | number> = [];
  if (content) {
    validProps.push(content);
  }

  for (const prop of props) {
    if (!isRecord(prop)) {
      continue;
    }

    const propContent = namePart(prop.content);
    if (propContent !== undefined) {
      validProps.push(propContent);
    }
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

function outputVariableNames(tmpl: Template): string[] {
  if (!isOutputToken(tmpl)) {
    return [];
  }

  const result = extractProps(tmpl);
  if (!result.valid) {
    return [];
  }

  const varName = buildVariable(result.props);
  if (!varName) {
    return [];
  }

  return [varName];
}

function loopCollectionNames(tmpl: Template): string[] {
  if (!(tmpl instanceof ForTag || tmpl instanceof TablerowTag)) {
    return [];
  }

  const { token } = tmpl;
  const tagOutput = token.input.slice(token.begin, token.end);
  const tagName = tmpl instanceof ForTag ? 'for' : 'tablerow';
  const loopMatch = tagOutput.match(new RegExp(`^\\s*{%\\s*${tagName}\\s+\\w+\\s+in\\s+(.+?)\\s*%}`));
  if (!loopMatch) {
    return [];
  }

  const collExpr = loopMatch[1].trim();
  if (collExpr.match(/^\(.+?\.\..+?\)$/)) {
    return [];
  }

  const collVar = extractVariableFromExpression(collExpr);
  if (!collVar) {
    return [];
  }

  return [collVar];
}

function readTemplateList(value: unknown): Template[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Template => isRecord(item) && 'token' in item);
}

function nestedTemplateGroups(tmpl: Tag): Template[][] {
  if (!isRecord(tmpl)) {
    return [];
  }

  const groups = [readTemplateList(tmpl.templates)];
  const branches = Array.isArray(tmpl.branches) ? tmpl.branches : [];
  for (const branch of branches) {
    if (!isRecord(branch)) {
      continue;
    }

    groups.push(readTemplateList(branch.templates));
  }
  groups.push(readTemplateList(tmpl.elseTemplates));

  return groups;
}

function extractRawVariableNames(templates: Template[]): string[] {
  const names: string[] = [];

  for (const tmpl of templates) {
    names.push(...outputVariableNames(tmpl));
    names.push(...loopCollectionNames(tmpl));

    if (!isTagToken(tmpl)) {
      continue;
    }

    for (const group of nestedTemplateGroups(tmpl)) {
      names.push(...extractRawVariableNames(group));
    }
  }

  return names;
}

function annotateCollectionVariable(
  iteratorVariable: string,
  collectionVariable: string | null,
  nestedTemplates: Template[],
  validVariables: Array<Variable>,
  invalidVariables: Array<Variable>
) {
  if (!collectionVariable) return;

  const rawNames = extractRawVariableNames(nestedTemplates);
  const iteratorPrefix = `${iteratorVariable}.`;
  const iteratorProps = [
    ...new Set(
      rawNames.filter((name) => name.startsWith(iteratorPrefix)).map((name) => name.slice(iteratorPrefix.length))
    ),
  ];

  const allVariables = [...validVariables, ...invalidVariables];
  const collectionVar = allVariables.find((v) => v.name === collectionVariable);
  if (collectionVar) {
    collectionVar.isForLoopCollection = true;
    collectionVar.iteratorProperties = iteratorProps;
  }
}

type LiquidValueNode = {
  initial?: object;
  lhs?: LiquidValueNode | LiquidValueNode[];
  rhs?: LiquidValueNode | LiquidValueNode[];
};

function collectValueVariables(val: LiquidValueNode | LiquidValueNode[], variables: string[]): void {
  if (Array.isArray(val)) {
    for (const item of val) {
      collectValueVariables(item, variables);
    }

    return;
  }

  if (val.initial) {
    const varName = buildVariableFromValue(val);
    if (varName) {
      variables.push(varName);
    }
  }

  if (val.lhs) {
    collectValueVariables(val.lhs, variables);
  }

  if (val.rhs) {
    collectValueVariables(val.rhs, variables);
  }
}

function extractVariablesFromValue(value: LiquidValueNode): string[] {
  const variables: string[] = [];
  collectValueVariables(value, variables);

  return variables;
}

function buildVariableFromValue(value: LiquidValueNode): string | null {
  if (!isRecord(value.initial)) {
    return null;
  }

  const parts: Array<string | number> = [];
  const content = stringField(value.initial, 'content');
  if (content) {
    parts.push(content);
  }

  const postfix = Array.isArray(value.initial.postfix) ? value.initial.postfix : [];
  const firstPostfix = postfix[0];
  const props = isRecord(firstPostfix) && Array.isArray(firstPostfix.props) ? firstPostfix.props : [];
  for (const prop of props) {
    if (!isRecord(prop)) {
      continue;
    }

    const propContent = namePart(prop.content);
    if (propContent !== undefined) {
      parts.push(propContent);
    }
  }

  return parts.length > 0 ? buildVariable(parts) : null;
}
