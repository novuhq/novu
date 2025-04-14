import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';
import { VARIABLE_REGEX_STRING } from '@/components/primitives/control-input/variable-plugin';
import { parseVariable } from '@/components/primitives/control-input/variable-plugin/utils';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { VariablePill } from '@/components/variable/variable-pill';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { resolveRepeatBlockAlias } from '../variables/variables';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getFilters } from '@/components/variable/constants';

type InternalVariableViewProps = NodeViewProps & {
  isAllowedVariable: IsAllowedVariable;
};

function InternalVariableView(props: InternalVariableViewProps) {
  const { node, updateAttributes, editor, isAllowedVariable } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parseVariableCallback = useCallback((variable: string, isEnhancedDigestEnabled: boolean) => {
    const regex = new RegExp(VARIABLE_REGEX_STRING, 'g');
    const match = regex.exec(variable);

    if (!match) {
      return {
        name: '',
        fullLiquidExpression: '',
        start: 0,
        end: 0,
        filters: [],
        issues: [],
      };
    }

    const parsedVariable = parseVariable(match);

    const allFilters = getFilters(isEnhancedDigestEnabled);

    const filtersWithIssues = parsedVariable.filters
      .map((filterStr) => {
        if (!filterStr) return null;

        const [filterNameRaw, filterParamsRaw = ''] = filterStr.split(':');
        const filterName = filterNameRaw?.trim();
        const filterParams = filterParamsRaw?.split(',').map((p) => (p ?? '').trim());

        if (!filterName) return null;

        const filterDefinition = allFilters.find((f) => f.value === filterName);
        if (!filterDefinition || !Array.isArray(filterDefinition.params)) return null;

        const issues = filterDefinition.params
          .map((paramDef, index) => {
            const isRequired = paramDef.required;
            const paramValue = filterParams[index];

            const isMissing =
              isRequired &&
              (!paramValue || paramValue.trim() === '' || paramValue.trim() === "''" || paramValue.trim() === '""');

            if (isMissing) {
              return {
                param: paramDef.placeholder,
                issue: `${paramDef.placeholder} is required`,
              };
            }

            return null;
          })
          .filter((issue) => issue !== null);

        return issues.length > 0 ? { filterName, issues } : null;
      })
      .filter((f): f is { filterName: string; issues: { param: string; issue: string }[] } => f !== null);

    return {
      ...parsedVariable,
      issues: filtersWithIssues,
    };
  }, []);

  const { name, filters, fullLiquidExpression, issues } = useMemo(
    () => parseVariableCallback(variableValue, isEnhancedDigestEnabled),
    [variableValue, parseVariableCallback, isEnhancedDigestEnabled]
  );

  const variable: LiquidVariable = useMemo(() => {
    return {
      name: fullLiquidExpression,
      aliasFor,
    };
  }, [aliasFor, fullLiquidExpression]);

  console.log({ fff: filters, issues });

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variable}
        isAllowedVariable={isAllowedVariable}
        onUpdate={(newValue) => {
          const { fullLiquidExpression } = parseVariableCallback(newValue, isEnhancedDigestEnabled);
          updateAttributes({
            id: fullLiquidExpression,
            aliasFor: resolveRepeatBlockAlias(fullLiquidExpression, editor, isEnhancedDigestEnabled),
          });
          setVariableValue(newValue);
          // Focus back to the editor after updating the variable
          editor.view.focus();
        }}
      >
        <VariablePill
          issues={issues}
          variableName={name}
          filters={filters}
          onClick={() => setIsOpen(true)}
          className="-mt-[2px]"
        />
      </EditVariablePopover>
    </NodeViewWrapper>
  );
}

// HOC that takes isAllowedVariable prop
export function createVariableView(isAllowedVariable: IsAllowedVariable) {
  return function VariableView(props: NodeViewProps) {
    return <InternalVariableView {...props} isAllowedVariable={isAllowedVariable} />;
  };
}
