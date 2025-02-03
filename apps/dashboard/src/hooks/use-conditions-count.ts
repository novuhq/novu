import { useMemo } from 'react';
import { RQBJsonLogic, RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';

function countRules(query: RuleGroupType): number {
  let count = 0;

  for (const rule of query.rules) {
    if ('rules' in rule) {
      count += countRules(rule);
    } else {
      count += 1;
    }
  }

  return count;
}

export const useConditionsCount = (jsonLogic?: RQBJsonLogic) => {
  return useMemo(() => {
    if (!jsonLogic) return 0;

    const query = parseJsonLogic(jsonLogic);

    return countRules(query);
  }, [jsonLogic]);
};
