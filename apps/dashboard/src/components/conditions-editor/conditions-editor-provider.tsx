import { useCallback, useMemo } from 'react';
import { add, type Path, type RuleGroupType, type RuleGroupTypeAny, type RuleType, remove } from 'react-querybuilder';
import { useDataRef } from '@/hooks/use-data-ref';
import { generateUUID } from '@/utils/uuid';
import { ConditionsEditorContext } from './conditions-editor-context';
import { getGroupAtPath } from './conditions-editor-policy';

export function ConditionsEditorProvider({
  children,
  queryRef,
  onQueryChange,
  maxConditionsPerGroup,
}: {
  children: React.ReactNode;
  queryRef: { current: RuleGroupType };
  onQueryChange: (query: RuleGroupType) => boolean;
  maxConditionsPerGroup: number;
}) {
  const queryChangeRef = useDataRef(onQueryChange);
  const maxConditionsPerGroupRef = useDataRef(maxConditionsPerGroup);

  const commitQueryChange = useCallback(
    (nextQuery: RuleGroupType) => queryChangeRef.current(nextQuery),
    [queryChangeRef]
  );

  const canAddToGroup = useCallback(
    (path: Path = []) => {
      const group = getGroupAtPath(queryRef.current, path);

      return !!group && group.rules.length < maxConditionsPerGroupRef.current;
    },
    [maxConditionsPerGroupRef, queryRef]
  );

  const removeRuleOrGroup = useCallback(
    (path: Path) => {
      commitQueryChange(remove(queryRef.current, path));
    },
    [commitQueryChange, queryRef]
  );

  const cloneRuleOrGroup = useCallback(
    (ruleOrGroup: RuleGroupTypeAny | RuleType, path: Path = []) => {
      if (!canAddToGroup(path)) {
        return false;
      }

      return commitQueryChange(add(queryRef.current, { ...ruleOrGroup, id: generateUUID() } as RuleType, path));
    },
    [canAddToGroup, commitQueryChange, queryRef]
  );

  const contextValue = useMemo(
    () => ({
      removeRuleOrGroup,
      cloneRuleOrGroup,
      maxConditionsPerGroup,
      canAddToGroup,
    }),
    [removeRuleOrGroup, cloneRuleOrGroup, maxConditionsPerGroup, canAddToGroup]
  );

  return <ConditionsEditorContext.Provider value={contextValue}>{children}</ConditionsEditorContext.Provider>;
}
