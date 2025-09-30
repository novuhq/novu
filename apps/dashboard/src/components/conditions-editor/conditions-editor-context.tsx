import { createContext, useCallback, useContext, useMemo } from 'react';
import { add, isRuleGroup, Path, RuleGroupType, RuleGroupTypeAny, RuleType, remove } from 'react-querybuilder';
import { useDataRef } from '@/hooks/use-data-ref';
import { generateUUID } from '@/utils/uuid';
import { ConditionsEditorContextType } from './types';

export const ConditionsEditorContext = createContext<ConditionsEditorContextType>({
  removeRuleOrGroup: () => {},
  cloneRuleOrGroup: () => {},
  getParentGroup: () => null,
});

export function ConditionsEditorProvider({
  children,
  query,
  onQueryChange,
}: {
  children: React.ReactNode;
  query: RuleGroupType;
  onQueryChange: (query: RuleGroupType) => void;
}) {
  const queryRef = useDataRef(query);
  const queryChangeRef = useDataRef(onQueryChange);

  const removeRuleOrGroup = useCallback(
    (path: Path) => {
      queryChangeRef.current(remove(queryRef.current, path));
    },
    [queryChangeRef, queryRef]
  );

  const cloneRuleOrGroup = useCallback(
    (ruleOrGroup: RuleGroupTypeAny | RuleType, path: Path = []) => {
      queryChangeRef.current(add(queryRef.current, { ...ruleOrGroup, id: generateUUID() } as RuleType, path));
    },
    [queryChangeRef, queryRef]
  );

  const getParentGroup = useCallback(
    (id?: string) => {
      if (!id) return queryRef.current;

      const findParent = (group: RuleGroupTypeAny): RuleGroupTypeAny | null => {
        for (const rule of group.rules) {
          if (typeof rule !== 'string' && rule.id === id) {
            return group;
          }

          if (isRuleGroup(rule)) {
            const parent = findParent(rule);

            if (parent) {
              return parent;
            }
          }
        }

        return null;
      };

      return findParent(queryRef.current);
    },
    [queryRef]
  );

  const contextValue = useMemo(
    () => ({ removeRuleOrGroup, cloneRuleOrGroup, getParentGroup }),
    [removeRuleOrGroup, cloneRuleOrGroup, getParentGroup]
  );

  return <ConditionsEditorContext.Provider value={contextValue}>{children}</ConditionsEditorContext.Provider>;
}

export const useConditionsEditorContext = () => useContext(ConditionsEditorContext);
