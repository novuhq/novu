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
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import type { JSONSchema7TypeName } from '@/components/schema-editor/json-schema';
import { RiListView } from 'react-icons/ri';
import { ToastIcon } from '../../../../primitives/sonner';
import { Button } from '../../../../primitives/button';

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

  const {
    getSchemaPropertyByKey,
    addProperty: addSchemaProperty,
    handleSaveChanges: handleSaveSchemaChanges,
    isPayloadSchemaEnabled,
  } = useWorkflowSchema();

  const [isPayloadSchemaDrawerOpen, setIsPayloadSchemaDrawerOpen] = useState(false);
  const [highlightedVariableKey, setHighlightedVariableKey] = useState<string | null>(null);

  const handleCreateNewVariable = useCallback(
    async (variableName: string) => {
      if (!workflow || !isPayloadSchemaEnabled) {
        return;
      }

      try {
        // Assuming new variables are of type string by default.
        addSchemaProperty({ keyName: variableName }, 'string' as JSONSchema7TypeName);

        await handleSaveSchemaChanges();

        showToast({
          children: () => (
            <div className="flex min-w-[350px] items-center justify-between gap-1.5">
              <div className="flex items-center gap-3">
                <ToastIcon variant="success" />
                <span className="min-w-[100px] text-sm">Variable added to schema</span>
              </div>

              <Button
                variant="secondary"
                mode="outline"
                size="2xs"
                leadingIcon={RiListView}
                onClick={() => setIsPayloadSchemaDrawerOpen(true)}
                className="shrink-0"
              >
                Manage schema
              </Button>
            </div>
          ),
          options: {
            position: 'bottom-right',
          },
        });
      } catch (error) {
        showErrorToast('Failed to save new variable to schema: ' + error);
      }
    },
    [workflow, isPayloadSchemaEnabled, addSchemaProperty, handleSaveSchemaChanges]
  );

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

  const validation = useVariableValidation(name, aliasFor, isAllowedVariable, getSchemaPropertyByKey);

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <EditVariablePopover
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        open={isOpen}
        onOpenChange={setIsOpen}
        variable={variable}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onManageSchemaClick={(variableName) => {
          setHighlightedVariableKey(variableName);
          setIsPayloadSchemaDrawerOpen(true);
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
        />
      </EditVariablePopover>
      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={(isOpen) => {
          setIsPayloadSchemaDrawerOpen(isOpen);

          if (!isOpen) {
            setHighlightedVariableKey(null);
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
