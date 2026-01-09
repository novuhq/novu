import { useCallback, useMemo } from 'react';
import { type Field, QueryBuilder, RuleGroupType, Translations } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';

import { AddConditionAction } from '@/components/conditions-editor/add-condition-action';
import { AddGroupAction } from '@/components/conditions-editor/add-group-action';
import { CombinatorSelector } from '@/components/conditions-editor/combinator-selector';
import { ConditionsEditorProvider } from '@/components/conditions-editor/conditions-editor-context';
import { FieldSelector } from '@/components/conditions-editor/field-selector';
import {
  getHelpTextForField,
  getPlaceholderForField,
  getValueEditorTypeForField,
} from '@/components/conditions-editor/field-type-editors';
import { getOperatorsForFieldType } from '@/components/conditions-editor/field-type-operators';
import { OperatorSelector } from '@/components/conditions-editor/operator-selector';
import { RuleActions } from '@/components/conditions-editor/rule-actions';
import { ValueEditor } from '@/components/conditions-editor/value-editor';
import {
  EnhancedLiquidVariable,
  type FieldDataType,
  IsAllowedVariable,
  LiquidVariable,
} from '@/utils/parseStepVariables';

export interface EnhancedField extends Field {
  dataType: FieldDataType;
  inputType?: string;
  format?: string;
}

const ruleActionsClassName = `*:data-[actions="true"]:opacity-0! [&:hover>[data-actions="true"]]:opacity-100! [&>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100!`;
const groupActionsClassName = `[&_.ruleGroup-header>[data-actions="true"]]:opacity-0! [&_.ruleGroup-header:hover>[data-actions="true"]]:opacity-100! [&_.ruleGroup-header>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100!`;
const nestedGroupClassName = `[&.ruleGroup_.ruleGroup]:p-3! [&.ruleGroup_.ruleGroup]:bg-neutral-50! [&.ruleGroup_.ruleGroup]:rounded-md! [&.ruleGroup_.ruleGroup]:border! [&.ruleGroup_.ruleGroup]:border-solid! [&.ruleGroup_.ruleGroup]:border-neutral-100!`;
const ruleGroupClassName = `[&.ruleGroup]:bg-transparent! [&.ruleGroup]:border-none! [&.ruleGroup]:p-0! ${nestedGroupClassName} [&_.ruleGroup-body_.rule]:items-start! ${groupActionsClassName}`;
const ruleClassName = `${ruleActionsClassName}`;

const controlClassnames = {
  ruleGroup: ruleGroupClassName,
  rule: ruleClassName,
  queryBuilder:
    'queryBuilder-branches [&_.rule]:before:border-stroke-soft! [&_.rule]:after:border-stroke-soft! [&_.ruleGroup_.ruleGroup]:before:border-stroke-soft! [&_.ruleGroup_.ruleGroup]:after:border-stroke-soft!',
};

const translations: Partial<Translations> = {
  addRule: {
    label: 'Add condition',
    title: 'Add condition',
  },
  addGroup: {
    label: 'Add group',
    title: 'Add group',
  },
};

const controlElements = {
  operatorSelector: OperatorSelector,
  combinatorSelector: CombinatorSelector,
  fieldSelector: FieldSelector,
  valueEditor: ValueEditor,
  addRuleAction: AddConditionAction,
  addGroupAction: AddGroupAction,
  removeGroupAction: RuleActions,
  removeRuleAction: RuleActions,
  cloneGroupAction: null,
  cloneRuleAction: null,
};

const accessibleDescriptionGenerator = () => '';

function InternalConditionsEditor({
  fields,
  variables,
  isAllowedVariable,
  query,
  onQueryChange,
  saveForm,
  enhancedVariables,
}: {
  fields: EnhancedField[];
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  saveForm: () => void;
  enhancedVariables?: EnhancedLiquidVariable[];
}) {
  const fieldDataMap = useMemo(() => {
    if (!enhancedVariables) return new Map();

    return new Map(
      enhancedVariables.map((variable) => [
        variable.name,
        {
          name: variable.name,
          label: variable.displayLabel || variable.name,
          value: variable.name,
          dataType: variable.dataType,
          inputType: variable.inputType,
          format: variable.format,
        },
      ])
    );
  }, [enhancedVariables]);

  const getOperators = useCallback(
    (fieldName: string) => {
      if (!enhancedVariables) {
        // Fallback to default string operators for variables not found in schema
        return getOperatorsForFieldType('string');
      }

      const fieldData = fieldDataMap.get(fieldName);

      if (!fieldData) {
        // Fallback to default string operators for variables not found in schema
        return getOperatorsForFieldType('string');
      }

      return getOperatorsForFieldType(fieldData.dataType);
    },
    [fieldDataMap, enhancedVariables]
  );

  const getValueEditorType = useCallback((fieldName: string, operator: string) => {
    return getValueEditorTypeForField(fieldName, operator);
  }, []);

  // Add new functions for placeholder and help text
  const getPlaceholder = useCallback(
    (fieldName: string, operator: string) => {
      if (!enhancedVariables) {
        // Fallback to default placeholder for variables not found in schema
        return getPlaceholderForField(fieldName, operator, {
          fieldData: {
            name: fieldName,
            label: fieldName,
            value: fieldName,
            dataType: 'string',
          } as EnhancedField,
        });
      }

      const fieldData = fieldDataMap.get(fieldName);

      if (!fieldData) {
        // Fallback to default placeholder for variables not found in schema
        return getPlaceholderForField(fieldName, operator, {
          fieldData: {
            name: fieldName,
            label: fieldName,
            value: fieldName,
            dataType: 'string',
          } as EnhancedField,
        });
      }

      return getPlaceholderForField(fieldName, operator, { fieldData });
    },
    [fieldDataMap, enhancedVariables]
  );

  const getHelpText = useCallback(
    (fieldName: string, operator: string) => {
      if (!enhancedVariables) {
        // Fallback to default help text for variables not found in schema
        return getHelpTextForField(operator, {
          fieldData: {
            name: fieldName,
            label: fieldName,
            value: fieldName,
            dataType: 'string',
          },
        });
      }

      const fieldData = fieldDataMap.get(fieldName);

      if (!fieldData) {
        // Fallback to default help text for variables not found in schema
        return getHelpTextForField(operator, {
          fieldData: {
            name: fieldName,
            label: fieldName,
            value: fieldName,
            dataType: 'string',
          },
        });
      }

      return getHelpTextForField(operator, { fieldData });
    },
    [fieldDataMap, enhancedVariables]
  );

  const context = useMemo(
    () => ({
      variables,
      isAllowedVariable,
      saveForm,
      getPlaceholder,
      getHelpText,
    }),
    [variables, isAllowedVariable, saveForm, getPlaceholder, getHelpText]
  );

  return (
    <QueryBuilder
      fields={fields}
      context={context}
      controlElements={controlElements}
      query={query}
      onQueryChange={onQueryChange}
      controlClassnames={controlClassnames}
      translations={translations}
      accessibleDescriptionGenerator={accessibleDescriptionGenerator}
      resetOnFieldChange={false}
      getOperators={getOperators}
      getValueEditorType={getValueEditorType}
    />
  );
}

export type ConditionsEditorContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  saveForm: () => void;
  getPlaceholder?: (fieldName: string, operator: string) => string;
  getHelpText?: (
    fieldName: string,
    operator: string
  ) => { title: string; description: string; examples: string[]; notes?: string[] };
};

export function ConditionsEditor({
  query,
  onQueryChange,
  fields,
  saveForm,
  variables,
  isAllowedVariable,
  enhancedVariables,
}: {
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  fields: EnhancedField[];
  saveForm: () => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  enhancedVariables?: EnhancedLiquidVariable[];
}) {
  return (
    <ConditionsEditorProvider query={query} onQueryChange={onQueryChange}>
      <InternalConditionsEditor
        fields={fields}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        query={query}
        onQueryChange={onQueryChange}
        saveForm={saveForm}
        enhancedVariables={enhancedVariables}
      />
    </ConditionsEditorProvider>
  );
}
