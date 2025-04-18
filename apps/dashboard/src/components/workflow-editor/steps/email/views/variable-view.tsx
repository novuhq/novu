import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { extractIssuesFromVariable } from '@/components/variable/utils';
import { VariablePill } from '@/components/variable/variable-pill';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { parseVariable } from '@/utils/liquid';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';
import { resolveRepeatBlockAlias } from '../variables/variables';
import { VariablePillOld } from '@/components/variable/variable-pill-old';

type InternalVariableViewProps = NodeViewProps & {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
};

function InternalVariableView(props: InternalVariableViewProps) {
  const { node, updateAttributes, editor, isAllowedVariable, deleteNode, variables } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parseVariableCallback = useCallback((variable: string, isEnhancedDigestEnabled: boolean) => {
    const parsedVariable = parseVariable(variable);

    if (!parsedVariable?.filtersArray) {
      return {
        name: '',
        fullLiquidExpression: '',
        start: 0,
        end: 0,
        filters: '',
        filtersArray: [],
        issues: [],
      };
    }

    const filtersWithIssues = extractIssuesFromVariable(parsedVariable.filtersArray, isEnhancedDigestEnabled);

    return {
      ...parsedVariable,
      issues: filtersWithIssues,
    };
  }, []);

  const { name, filtersArray, fullLiquidExpression, issues } = useMemo(
    () => parseVariableCallback(variableValue, isEnhancedDigestEnabled),
    [variableValue, parseVariableCallback, isEnhancedDigestEnabled]
  );

  const variable: LiquidVariable = useMemo(() => {
    return {
      name: fullLiquidExpression,
      aliasFor,
    };
  }, [aliasFor, fullLiquidExpression]);

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variable}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onUpdate={(newValue) => {
          const { fullLiquidExpression } = parseVariableCallback(newValue, isEnhancedDigestEnabled);
          const aliasFor = resolveRepeatBlockAlias(fullLiquidExpression, editor, isEnhancedDigestEnabled);

          if (fullLiquidExpression) {
            updateAttributes({
              id: fullLiquidExpression,
              aliasFor,
            });
          }

          setVariableValue(newValue);
          // Focus back to the editor after updating the variable
          editor.view.focus();
        }}
        onDeleteClick={() => {
          deleteNode();

          setTimeout(() => {
            editor.view.focus();
          }, 0);
        }}
      >
        {isEnhancedDigestEnabled ? (
          <VariablePill
            issues={issues}
            variableName={name}
            filters={filtersArray}
            onClick={() => setIsOpen(true)}
            className="-mt-[2px]"
          />
        ) : (
          <VariablePillOld
            variableName={name}
            hasFilters={filtersArray.length > 0}
            onClick={() => setIsOpen(true)}
            className="-mt-[2px]"
          />
        )}
      </EditVariablePopover>
    </NodeViewWrapper>
  );
}

// HOC that takes isAllowedVariable prop
export function createVariableView(variables: LiquidVariable[], isAllowedVariable: IsAllowedVariable) {
  return function VariableView(props: NodeViewProps) {
    return <InternalVariableView {...props} variables={variables} isAllowedVariable={isAllowedVariable} />;
  };
}
