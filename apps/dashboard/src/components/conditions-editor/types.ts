import type { ComponentType } from 'react';
import type { BaseOption, Path, RuleGroupTypeAny, RuleType } from 'react-querybuilder';
import type { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';

/**
 * Editor used for a rule's value. Defaults to a plain input. The workflow editor
 * should pass `ControlInput`; other callers may inject their own.
 */
export type ConditionsValueInput = ComponentType<{
  value: string;
  onChange: (value: string) => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  placeholder?: string;
  multiline?: boolean;
  indentWithTab?: boolean;
  size?: 'md' | 'sm' | '2xs' | '3xs';
  disabled?: boolean;
}>;

export const DEFAULT_MAX_CONDITIONS_PER_GROUP = 10;

export function normalizeMaxConditionsPerGroup(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_MAX_CONDITIONS_PER_GROUP;
  }

  return Math.floor(value);
}

export interface ConditionsEditorContextType {
  removeRuleOrGroup: (path: Path) => void;
  cloneRuleOrGroup: (ruleOrGroup: RuleGroupTypeAny | RuleType, path?: Path) => boolean;
  maxConditionsPerGroup: number;
  canAddToGroup: (path?: Path) => boolean;
  canCloneRuleOrGroup: (ruleOrGroup: RuleGroupTypeAny | RuleType, path?: Path) => boolean;
}

export interface VariablesListProps {
  options: Array<BaseOption<string>>;
  onSelect: (value: string) => void;
  value?: string;
}
