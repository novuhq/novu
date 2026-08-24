import { isRuleGroup, type Path, type RuleGroupTypeAny } from 'react-querybuilder';

export function getGroupAtPath(query: RuleGroupTypeAny, path: Path): RuleGroupTypeAny | null {
  let current = query;

  for (const index of path) {
    const next = current.rules[index];

    if (!isRuleGroup(next)) {
      return null;
    }

    current = next;
  }

  return current;
}

export function increasesGroupBeyondLimit(
  currentQuery: RuleGroupTypeAny,
  nextQuery: RuleGroupTypeAny,
  maxConditionsPerGroup: number
): boolean {
  const exceedsLimit = (nextGroup: RuleGroupTypeAny, currentGroup?: RuleGroupTypeAny): boolean => {
    if (nextGroup.rules.length > maxConditionsPerGroup && nextGroup.rules.length > (currentGroup?.rules.length ?? 0)) {
      return true;
    }

    return nextGroup.rules.some((rule, index) => {
      if (!isRuleGroup(rule)) {
        return false;
      }

      const existingGroup = currentGroup?.rules.find(
        (currentRule): currentRule is RuleGroupTypeAny =>
          isRuleGroup(currentRule) && rule.id !== undefined && currentRule.id === rule.id
      );
      const currentRuleAtIndex = currentGroup?.rules[index];
      const fallbackGroup = rule.id === undefined && isRuleGroup(currentRuleAtIndex) ? currentRuleAtIndex : undefined;

      return exceedsLimit(rule, existingGroup ?? fallbackGroup);
    });
  };

  return exceedsLimit(nextQuery, currentQuery);
}
