import isEqual from 'lodash.isequal';
import type { RQBJsonLogic, RuleGroupType, RuleGroupTypeAny } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { parseJsonLogicOptions } from '@/utils/conditions';

export type JsonLogicRule = Record<string, unknown>;

/**
 * Opens a stored rule in the editor only when saving it again, unedited, writes the same rule back
 * (the editor's `{ and: [rule] }` wrapper aside). Returns null for a rule the editor would shorten or change.
 */
export function parseLosslessRule(
  rule: JsonLogicRule,
  {
    format,
    prepare = (query) => query,
  }: {
    format: (query: RuleGroupType) => JsonLogicRule | null;
    prepare?: (query: RuleGroupTypeAny) => RuleGroupTypeAny;
  }
): RuleGroupType | null {
  const query = prepare(
    parseJsonLogic(rule as RQBJsonLogic, { generateIDs: true, ...parseJsonLogicOptions })
  ) as RuleGroupType;
  const saved = format(query);

  return isEqual(saved, rule) || isEqual(saved, { and: [rule] }) ? query : null;
}
