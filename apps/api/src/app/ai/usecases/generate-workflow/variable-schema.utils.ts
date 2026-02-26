import { JsonSchemaTypeEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import { buildVariables } from '../../../shared/utils/build-variables';
import { buildContextSchema, buildSubscriberSchema, buildWorkflowSchema } from '../../../shared/utils/create-schema';
import { DIGEST_EVENTS_PAYLOAD_VARIABLE_PATTERN } from '../../../shared/utils/template-parser/parser-utils';
import { computeResultSchema } from '../../../workflows-v2/shared';

const PAYLOAD_PREFIX = 'payload.';
const CURRENT_PAYLOAD_PREFIX = 'current.payload.';

export interface PayloadVariable {
  name: string;
  path: string[];
  inferredType: JsonSchemaTypeEnum;
}

export interface GeneratedStep {
  name: string;
  stepId: string;
  type: StepTypeEnum;
  controlValues: Record<string, unknown>;
}

export interface VariableSchemaContext {
  payloadSchema: JSONSchemaDto;
  previousSteps: GeneratedStep[];
}

export function createInitialVariableSchemaContext(): VariableSchemaContext {
  return {
    payloadSchema: createEmptyPayloadSchema(),
    previousSteps: [],
  };
}

export function buildFullVariableSchema(context: VariableSchemaContext): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      workflow: buildWorkflowSchema() as JSONSchemaDto,
      subscriber: buildSubscriberSchema(undefined) as JSONSchemaDto,
      steps: buildPreviousStepsSchema(context.previousSteps, context.payloadSchema),
      payload: context.payloadSchema,
      context: buildContextSchema() as JSONSchemaDto,
    },
    additionalProperties: false,
  };
}

function buildPreviousStepsSchema(steps: GeneratedStep[], payloadSchema: JSONSchemaDto): JSONSchemaDto {
  const properties: Record<string, JSONSchemaDto> = {};

  for (const step of steps) {
    const resultSchema = computeResultSchema({
      stepType: step.type,
      payloadSchema,
    });

    if (resultSchema) {
      properties[step.stepId] = resultSchema as JSONSchemaDto;
    }
  }

  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties,
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  };
}

export function extractPayloadVariablesFromControlValues(controlValues: Record<string, unknown>): PayloadVariable[] {
  const payloadVariables: PayloadVariable[] = [];
  const seenPaths = new Set<string>();

  for (const controlValue of Object.values(controlValues)) {
    if (controlValue === null || controlValue === undefined) continue;

    const { validVariables, invalidVariables } = buildVariables({
      variableSchema: undefined,
      controlValue,
      suggestPayloadNamespace: false,
    });

    const allVariables = [...validVariables, ...invalidVariables];
    for (const variable of allVariables) {
      const variablePatterns = [PAYLOAD_PREFIX, CURRENT_PAYLOAD_PREFIX, DIGEST_EVENTS_PAYLOAD_VARIABLE_PATTERN];
      for (const pattern of variablePatterns) {
        const isStringPattern = typeof pattern === 'string';
        const isRegExpPattern = pattern instanceof RegExp;
        if (
          (isStringPattern && variable.name.startsWith(pattern)) ||
          (isRegExpPattern && variable.name.match(pattern))
        ) {
          const variablePath = isStringPattern
            ? variable.name.slice(pattern.length)
            : variable.name.replace(pattern, '');
          if (seenPaths.has(variablePath)) continue;
          seenPaths.add(variablePath);

          const pathParts = variablePath.split('.');
          const inferredType = inferTypeFromVariableName(variablePath);

          payloadVariables.push({
            name: variablePath,
            path: pathParts,
            inferredType,
          });
        }
      }
    }
  }

  return payloadVariables;
}

function inferTypeFromVariableName(variableName: string): JsonSchemaTypeEnum {
  const lowerName = variableName.toLowerCase();

  if (
    lowerName.includes('count') ||
    lowerName.includes('amount') ||
    lowerName.includes('total') ||
    lowerName.includes('quantity') ||
    lowerName.includes('price') ||
    lowerName.includes('number')
  ) {
    return JsonSchemaTypeEnum.NUMBER;
  }

  if (
    lowerName.startsWith('is') ||
    lowerName.startsWith('has') ||
    lowerName.includes('enabled') ||
    lowerName.includes('active') ||
    lowerName.includes('verified') ||
    lowerName.includes('confirmed') ||
    lowerName.includes('approved') ||
    lowerName.includes('archived') ||
    lowerName.includes('deleted') ||
    lowerName.includes('hidden') ||
    lowerName.includes('disabled') ||
    lowerName.includes('inactive') ||
    lowerName.includes('unverified')
  ) {
    return JsonSchemaTypeEnum.BOOLEAN;
  }

  return JsonSchemaTypeEnum.STRING;
}

export function mergePayloadVariables(existingSchema: JSONSchemaDto, newVariables: PayloadVariable[]): JSONSchemaDto {
  const mergedSchema: JSONSchemaDto = JSON.parse(JSON.stringify(existingSchema));

  for (const variable of newVariables) {
    addVariableToSchema(mergedSchema, variable);
  }

  return mergedSchema;
}

function addVariableToSchema(schema: JSONSchemaDto, variable: PayloadVariable): void {
  if (!schema.properties || !schema.required) return;

  const { path, inferredType, name } = variable;

  if (path.length === 1) {
    const propertyName = path[0];
    if (!schema.properties[propertyName]) {
      schema.properties[propertyName] = {
        type: inferredType,
        description: `Variable: ${name}`,
      };
      if (!schema.required.includes(propertyName)) {
        schema.required.push(propertyName);
      }
    }

    return;
  }

  let currentSchema = schema;
  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i];

    if (!currentSchema.properties) {
      currentSchema.properties = {};
    }

    if (!currentSchema.properties[part]) {
      currentSchema.properties[part] = {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {},
        required: [],
        additionalProperties: false,
      };
    }

    if (!currentSchema.required) {
      currentSchema.required = [];
    }

    if (!currentSchema.required.includes(part)) {
      currentSchema.required.push(part);
    }

    currentSchema = currentSchema.properties[part] as JSONSchemaDto;
  }

  const lastPart = path[path.length - 1];
  if (!currentSchema.properties) {
    currentSchema.properties = {};
  }

  if (!currentSchema.properties[lastPart]) {
    currentSchema.properties[lastPart] = {
      type: inferredType,
      description: `Variable: ${name}`,
    };
    if (!currentSchema.required) {
      currentSchema.required = [];
    }
    if (!currentSchema.required.includes(lastPart)) {
      currentSchema.required.push(lastPart);
    }
  }
}

export function updateVariableSchemaContext(
  context: VariableSchemaContext,
  step: GeneratedStep,
  extractedVariables: PayloadVariable[]
): VariableSchemaContext {
  return {
    payloadSchema: mergePayloadVariables(context.payloadSchema, extractedVariables),
    previousSteps: [...context.previousSteps, step],
  };
}

export function formatVariableSchemaForPrompt(schema: JSONSchemaDto): string {
  const lines: string[] = [];

  if (schema.properties) {
    const { subscriber, payload, steps } = schema.properties as Record<string, JSONSchemaDto>;

    if (subscriber?.properties) {
      lines.push('### Subscriber Variables');
      lines.push('Available subscriber properties:');
      for (const key of Object.keys(subscriber.properties)) {
        lines.push(`- subscriber.${key}`);
      }
      lines.push('');
    }

    if (payload?.properties && Object.keys(payload.properties).length > 0) {
      lines.push('### Payload Variables');
      lines.push('IMPORTANT: Reuse these existing payload variables when appropriate:');
      formatNestedProperties(payload.properties, 'payload', lines);
      lines.push('');
    }

    if (steps?.properties && Object.keys(steps.properties).length > 0) {
      lines.push('### Previous Steps Results');
      lines.push('You can reference results from previous steps:');
      for (const [stepId, stepSchema] of Object.entries(steps.properties)) {
        const stepSchemaDto = stepSchema as JSONSchemaDto;
        if (stepSchemaDto.properties) {
          for (const prop of Object.keys(stepSchemaDto.properties)) {
            lines.push(`- steps.${stepId}.${prop}`);
          }
        }
      }
      lines.push('');
    }
  }

  if (lines.length === 0) {
    return '';
  }

  return lines.join('\n');
}

function formatNestedProperties(properties: Record<string, JSONSchemaDto>, prefix: string, lines: string[]): void {
  for (const [key, value] of Object.entries(properties)) {
    const fullPath = `${prefix}.${key}`;

    if (value.type === JsonSchemaTypeEnum.OBJECT && value.properties) {
      formatNestedProperties(value.properties, fullPath, lines);
    } else {
      lines.push(`- ${fullPath} (${value.type})`);
    }
  }
}

export function createEmptyPayloadSchema(): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {},
    required: [],
    additionalProperties: false,
  };
}

export function hasPayloadProperties(schema: JSONSchemaDto): boolean {
  return !!(schema.properties && Object.keys(schema.properties).length > 0);
}
