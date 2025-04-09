import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';

import { VARIABLE_REGEX_STRING } from '@/components/primitives/control-input/variable-plugin';
import { parseVariable } from '@/components/primitives/control-input/variable-plugin/utils';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { VariablePill } from '@/components/variable/variable-pill';
import { IsAllowedVariable } from '@/utils/parseStepVariables';
import { resolveRepeatBlockAlias } from '../variables/variables';
import { VariableWithContext } from '@/components/variable/types';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type InternalVariableViewProps = NodeViewProps & {
  isAllowedVariable: IsAllowedVariable;
};

function InternalVariableView(props: InternalVariableViewProps) {
  const { node, updateAttributes, editor, isAllowedVariable } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parseVariableCallback = useCallback((variable: string) => {
    const regex = new RegExp(VARIABLE_REGEX_STRING, 'g');
    const match = regex.exec(variable);

    if (!match) {
      return { name: '', fullLiquidExpression: '', start: 0, end: 0, filters: [] };
    }

    return parseVariable(match);
  }, []);

  const variableWithContext: VariableWithContext = useMemo(() => {
    return {
      name: id,
      aliasFor,
    };
  }, [id, aliasFor]);

  const { filters } = useMemo(() => parseVariableCallback(variableValue), [variableValue, parseVariableCallback]);

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variableWithContext}
        isAllowedVariable={isAllowedVariable}
        onUpdate={(newValue) => {
          const { fullLiquidExpression } = parseVariableCallback(newValue);
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
          variableName={variableWithContext.name}
          hasFilters={!!filters?.length}
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
