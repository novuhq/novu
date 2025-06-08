import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { validateEnhancedDigestFilters } from '@/components/variable/utils';
import { VariablePill } from '@/components/variable/variable-pill';
import { useVariableValidation } from '@/components/variable/hooks/use-variable-validation';
import { parseVariable } from '@/utils/liquid';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useMemo, useState } from 'react';
import { resolveRepeatBlockAlias } from '../variables/variables';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';

type InternalVariableViewProps = NodeViewProps & {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
};

function InternalVariableView(props: InternalVariableViewProps) {
  const { node, updateAttributes, editor, isAllowedVariable, deleteNode, variables } = props;
  const { id, aliasFor } = node.attrs;
  const [variableValue, setVariableValue] = useState(`{{${id}}}`);
  const [isOpen, setIsOpen] = useState(false);
  const { digestStepBeforeCurrent, workflow } = useWorkflow();

  const { getSchemaPropertyByKey, isPayloadSchemaEnabled } = useWorkflowSchema();

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  const parseVariableCallback = useCallback(
    (variable: string) => {
      const parsedVariable = parseVariable(variable);

      if (!parsedVariable?.filtersArray) {
        return {
          name: '',
          fullLiquidExpression: '',
          start: 0,
          end: 0,
          filters: '',
          filtersArray: [],
          issues: null,
        };
      }

      let issue: ReturnType<typeof validateEnhancedDigestFilters> = null;
      const { value } = getDynamicDigestVariable({
        type: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
        digestStepName: digestStepBeforeCurrent?.stepId,
      });

      if (value && value.split('|')[0].trim() === parsedVariable.name) {
        issue = validateEnhancedDigestFilters(parsedVariable.filtersArray);
      }

      return {
        ...parsedVariable,
        issues: issue,
      };
    },
    [digestStepBeforeCurrent?.stepId]
  );

  const { name, filtersArray, fullLiquidExpression, issues } = useMemo(
    () => parseVariableCallback(variableValue),
    [variableValue, parseVariableCallback]
  );

  const variable: LiquidVariable = useMemo(() => {
    return {
      name: fullLiquidExpression,
      aliasFor,
    };
  }, [aliasFor, fullLiquidExpression]);

  const validation = useVariableValidation(
    name,
    aliasFor,
    isAllowedVariable,
    getSchemaPropertyByKey,
    isPayloadSchemaEnabled
  );

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variable}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onManageSchemaClick={(variableName) => {
          openSchemaDrawer(variableName);
        }}
        onAddToSchemaClick={(variableName) => {
          handleCreateNewVariable(variableName);
        }}
        onUpdate={(newValue) => {
          const { fullLiquidExpression } = parseVariableCallback(newValue);
          const aliasFor = resolveRepeatBlockAlias(fullLiquidExpression, editor);

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
        <VariablePill
          issues={issues}
          variableName={name}
          filters={filtersArray}
          onClick={() => setIsOpen(true)}
          className="-mt-[2px]"
          isNotInSchema={!validation.isInSchema}
          isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        />
      </EditVariablePopover>
      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeSchemaDrawer();
          }
        }}
        workflow={workflow}
        highlightedPropertyKey={highlightedVariableKey}
      />
    </NodeViewWrapper>
  );
}

// HOC that takes isAllowedVariable prop
export function createVariableView(variables: LiquidVariable[], isAllowedVariable: IsAllowedVariable) {
  return function VariableView(props: NodeViewProps) {
    return <InternalVariableView {...props} variables={variables} isAllowedVariable={isAllowedVariable} />;
  };
}
