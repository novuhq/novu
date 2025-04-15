import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';

import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { VariablePill } from '@/components/variable/variable-pill';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { resolveRepeatBlockAlias } from '../variables/variables';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { parseVariable } from '@/utils/liquid';

type InternalVariableViewProps = NodeViewProps & {
  isAllowedVariable: IsAllowedVariable;
};

function InternalVariableView(props: InternalVariableViewProps) {
  const { node, updateAttributes, editor, isAllowedVariable, deleteNode } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parseVariableCallback = useCallback((variable: string) => {
    const parsedVariable = parseVariable(variable);

    if (!parsedVariable) {
      return { name: '', fullLiquidExpression: '', start: 0, end: 0, filtersArray: [] };
    }

    return parsedVariable;
  }, []);

  const { name, filtersArray, fullLiquidExpression } = useMemo(
    () => parseVariableCallback(variableValue),
    [variableValue, parseVariableCallback]
  );

  const variable: LiquidVariable = {
    name: fullLiquidExpression,
    aliasFor,
  };

  const handleOpenChange = (open: boolean, newValue: string) => {
    if (!open) {
      const { name } = parseVariableCallback(newValue);

      if (!name) {
        deleteNode();

        setTimeout(() => {
          editor.view.focus();
        }, 0);
      }
    }

    setIsOpen(open);
  };

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        open={isOpen}
        onOpenChange={handleOpenChange}
        variable={variable}
        isAllowedVariable={isAllowedVariable}
        onUpdate={(newValue) => {
          const { fullLiquidExpression } = parseVariableCallback(newValue);
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
      >
        <VariablePill
          variableName={name}
          hasFilters={!!filtersArray?.length}
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
