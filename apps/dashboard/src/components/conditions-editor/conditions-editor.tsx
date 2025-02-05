import { useMemo } from 'react';
import { type Field, QueryBuilder, RuleGroupType, Translations } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';

import { LiquidVariable } from '@/utils/parseStepVariablesToLiquidVariables';
import { ConditionsEditorProvider } from '@/components/conditions-editor/conditions-editor-context';
import { AddConditionAction } from '@/components/conditions-editor/add-condition-action';
import { AddGroupAction } from '@/components/conditions-editor/add-group-action';
import { OperatorSelector } from '@/components/conditions-editor/operator-selector';
import { CombinatorSelector } from '@/components/conditions-editor/combinator-selector';
import { ValueEditor } from '@/components/conditions-editor/value-editor';
import { FieldSelector } from '@/components/conditions-editor/field-selector';
import { RuleActions } from '@/components/conditions-editor/rule-actions';

const ruleActionsClassName = `[&>[data-actions="true"]]:opacity-0 [&:hover>[data-actions="true"]]:opacity-100 [&>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100`;
const groupActionsClassName = `[&_.ruleGroup-header>[data-actions="true"]]:opacity-0 [&_.ruleGroup-header:hover>[data-actions="true"]]:opacity-100 [&_.ruleGroup-header>[data-actions="true"]:has(~[data-radix-popper-content-wrapper])]:opacity-100`;
const nestedGroupClassName = `[&.ruleGroup_.ruleGroup]:p-3 [&.ruleGroup_.ruleGroup]:bg-neutral-50 [&.ruleGroup_.ruleGroup]:rounded-md [&.ruleGroup_.ruleGroup]:border [&.ruleGroup_.ruleGroup]:border-solid [&.ruleGroup_.ruleGroup]:border-neutral-100`;
const ruleGroupClassName = `[&.ruleGroup]:[background:transparent] [&.ruleGroup]:[border:none] [&.ruleGroup]:p-0 ${nestedGroupClassName} [&_.ruleGroup-body_.rule]:items-start ${groupActionsClassName}`;
const ruleClassName = `${ruleActionsClassName}`;

const controlClassnames = {
  ruleGroup: ruleGroupClassName,
  rule: ruleClassName,
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

function InternalConditionsEditor({
  fields,
  variables,
  query,
  onQueryChange,
}: {
  fields: Field[];
  variables: LiquidVariable[];
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
}) {
  const context = useMemo(() => ({ variables }), [variables]);

  return (
    <QueryBuilder
      fields={fields}
      context={context}
      controlElements={controlElements}
      query={query}
      onQueryChange={onQueryChange}
      controlClassnames={controlClassnames}
      translations={translations}
      accessibleDescriptionGenerator={() => ''}
    />
  );
}

export function ConditionsEditor({
  query,
  onQueryChange,
  fields,
  variables,
}: {
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
  fields: Field[];
  variables: LiquidVariable[];
}) {
  return (
    <ConditionsEditorProvider query={query} onQueryChange={onQueryChange}>
      <InternalConditionsEditor fields={fields} variables={variables} query={query} onQueryChange={onQueryChange} />
    </ConditionsEditorProvider>
  );
}
