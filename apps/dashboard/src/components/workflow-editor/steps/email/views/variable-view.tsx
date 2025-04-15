import { VARIABLE_REGEX_STRING } from '@/components/primitives/control-input/variable-plugin';
import { parseVariable } from '@/components/primitives/control-input/variable-plugin/utils';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { extractIssuesFromVariable } from '@/components/variable/utils';
import { VariablePill } from '@/components/variable/variable-pill';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';
import { resolveRepeatBlockAlias } from '../variables/variables';

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

    const filtersWithIssues = extractIssuesFromVariable(parsedVariable.filters, isEnhancedDigestEnabled);

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
