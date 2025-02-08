import { BaseOption, RuleGroupTypeAny, RuleType, Path } from 'react-querybuilder';

export interface ConditionsEditorContextType {
  removeRuleOrGroup: (path: Path) => void;
  cloneRuleOrGroup: (ruleOrGroup: RuleGroupTypeAny | RuleType, path?: Path) => void;
  getParentGroup: (id?: string) => RuleGroupTypeAny | null;
}

export interface VariablesListProps {
  options: Array<BaseOption<string>>;
  onSelect: (value: string) => void;
  value?: string;
}
