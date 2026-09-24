import { IMessageFilter, type JSONSchemaDto } from '@novu/shared';
import { generateID, RuleGroupType } from 'react-querybuilder';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { type FieldDataType, type IsAllowedVariable, parseStepVariables } from '@/utils/parseStepVariables';

const INTEGRATION_CONDITION_FIELD_DEFS: Array<{ name: string; dataType: FieldDataType }> = [
  { name: 'context.tenant.id', dataType: 'string' },
  { name: 'subscriber.subscriberId', dataType: 'string' },
  { name: 'subscriber.email', dataType: 'string' },
  { name: 'subscriber.phone', dataType: 'string' },
  { name: 'subscriber.firstName', dataType: 'string' },
  { name: 'subscriber.lastName', dataType: 'string' },
  { name: 'subscriber.locale', dataType: 'string' },
  { name: 'subscriber.data', dataType: 'object' },
  { name: 'workflow.workflowId', dataType: 'string' },
  { name: 'workflow.name', dataType: 'string' },
  { name: 'workflow.description', dataType: 'string' },
  { name: 'workflow.tags', dataType: 'array' },
  { name: 'workflow.severity', dataType: 'string' },
];

export const INTEGRATION_CONDITION_VARIABLES: EnhancedConditionVariable[] = INTEGRATION_CONDITION_FIELD_DEFS.map(
  (field) => ({
    name: field.name,
    displayLabel: field.name,
    dataType: field.dataType,
  })
);

export function mergeIntegrationConditionVariables(
  variables: EnhancedConditionVariable[]
): EnhancedConditionVariable[] {
  const variablesByName = new Map<string, EnhancedConditionVariable>();

  for (const variable of variables) {
    const existingVariable = variablesByName.get(variable.name);

    if (!existingVariable) {
      variablesByName.set(variable.name, variable);
      continue;
    }

    if (existingVariable.dataType !== variable.dataType) {
      variablesByName.set(variable.name, {
        ...existingVariable,
        displayLabel: `${variable.name} (mixed types)`,
        dataType: 'mixed',
        format: undefined,
        inputType: undefined,
      });
    }
  }

  return Array.from(variablesByName.values());
}

export function buildPayloadConditionVariables(payloadSchemas: JSONSchemaDto[]): EnhancedConditionVariable[] {
  return payloadSchemas.flatMap((payloadSchema) => {
    const schema: JSONSchemaDto = {
      type: 'object',
      properties: { payload: payloadSchema },
    };

    return parseStepVariables(schema, { isPayloadSchemaEnabled: true }).enhancedVariables.filter((variable) =>
      variable.name.startsWith('payload.')
    );
  });
}

const ALLOWED_PREFIXES = ['context.', 'payload.', 'subscriber.'] as const;

export const isAllowedIntegrationConditionVariable: IsAllowedVariable = (variable) => {
  if (INTEGRATION_CONDITION_VARIABLES.some((conditionVariable) => conditionVariable.name === variable.name)) {
    return true;
  }

  return ALLOWED_PREFIXES.some((prefix) => variable.name.startsWith(prefix) && variable.name.length > prefix.length);
};

export function countLegacyIntegrationConditions(conditions?: IMessageFilter[]): number {
  if (!conditions?.length) {
    return 0;
  }

  return conditions.reduce((sum, group) => sum + (group.children?.length ?? 0), 0);
}

export function createEmptyConditionsQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}
