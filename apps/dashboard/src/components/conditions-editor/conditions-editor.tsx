import { useMemo } from 'react';
import { type Field, QueryBuilder, RuleGroupType, Translations } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';

import { AddConditionAction } from '@/components/conditions-editor/add-condition-action';
import { AddGroupAction } from '@/components/conditions-editor/add-group-action';
import { CombinatorSelector } from '@/components/conditions-editor/combinator-selector';
import { ConditionsEditorProvider } from '@/components/conditions-editor/conditions-editor-context';
import { FieldSelector } from '@/components/conditions-editor/field-selector';
import { OperatorSelector } from '@/components/conditions-editor/operator-selector';
import { RuleActions } from '@/components/conditions-editor/rule-actions';
import { ValueEditor } from '@/components/conditions-editor/value-editor';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

const ruleActionsClassName = `[&>[data-actions="true"]]:opacity-0 [&:hover>[data-actions="true"]]:opacity-100 [&>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100`;
const groupActionsClassName = `[&_.ruleGroup-header>[data-actions="true"]]:opacity-0 [&_.ruleGroup-header:hover>[data-actions="true"]]:opacity-100 [&_.ruleGroup-header>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100`;
const nestedGroupClassName = `[&.ruleGroup_.ruleGroup]:p-3 [&.ruleGroup_.ruleGroup]:bg-neutral-50 [&.ruleGroup_.ruleGroup]:rounded-md [&.ruleGroup_.ruleGroup]:border [&.ruleGroup_.ruleGroup]:border-solid [&.ruleGroup_.ruleGroup]:border-neutral-100`;
const ruleGroupClassName = `[&.ruleGroup]:[background:transparent] [&.ruleGroup]:[border:none] [&.ruleGroup]:p-0 ${nestedGroupClassName} [&_.ruleGroup-body_.rule]:items-start ${groupActionsClassName}`;
const ruleClassName = `${ruleActionsClassName}`;

const controlClassnames = {
  ruleGroup: ruleGroupClassName,
  rule: ruleClassName,
  queryBuilder:
    'queryBuilder-branches [&_.rule]:before:border-stroke-soft [&_.rule]:after:border-stroke-soft [&_.ruleGroup_.ruleGroup]:before:border-stroke-soft [&_.ruleGroup_.ruleGroup]:after:border-stroke-soft',
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
}: {
  fields: Field[];
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  saveForm: () => void;
}) {
  const context = useMemo(() => ({ variables, isAllowedVariable, saveForm }), [variables, isAllowedVariable, saveForm]);

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
    />
  );
}

export type ConditionsEditorContext = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  saveForm: () => void;
};

export function ConditionsEditor({
  query,
  onQueryChange,
  fields,
  saveForm,
  variables,
  isAllowedVariable,
}: {
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  fields: Field[];
  saveForm: () => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
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
      />
    </ConditionsEditorProvider>
  );
}
