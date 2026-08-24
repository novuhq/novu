import type { BaseOption, Path, RuleGroupTypeAny, RuleType } from 'react-querybuilder';

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
