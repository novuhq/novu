import { generateID, type RuleGroupType } from 'react-querybuilder';
import type { EnhancedField } from '@/components/conditions-editor/conditions-editor';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';

export function mergeConditionVariables(variables: EnhancedConditionVariable[]): EnhancedConditionVariable[] {
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

export function toConditionField(variable: EnhancedConditionVariable): EnhancedField {
  return {
    name: variable.name,
    label: variable.displayLabel || variable.name,
    value: variable.name,
    dataType: variable.dataType,
    inputType: variable.inputType,
    format: variable.format,
    allowedValues: variable.allowedValues,
  };
}

export function createEmptyConditionsQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}
