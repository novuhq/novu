import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { validateEnhancedDigestFilters } from '@/components/variable/utils';
import { VariablePill } from '@/components/variable/variable-pill';
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
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import type { JSONSchema7TypeName } from '@/components/schema-editor/json-schema';

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
    currentSchema,
    getCurrentSchema,
  } = useWorkflowSchema();

  const [isPayloadSchemaDrawerOpen, setIsPayloadSchemaDrawerOpen] = useState(false);
  const [highlightedVariableKey, setHighlightedVariableKey] = useState<string | null>(null);
  const [isAddingToSchema, setIsAddingToSchema] = useState(false);
  const [justAddedVariable, setJustAddedVariable] = useState<string | null>(null);

  const handleCreateNewVariable = useCallback(
    async (variableName: string) => {
      if (!workflow || !isPayloadSchemaEnabled) {
        return;
      }

      setIsAddingToSchema(true);
      setJustAddedVariable(variableName);

      try {
        // Assuming new variables are of type string by default.
        addSchemaProperty({ keyName: variableName }, 'string' as JSONSchema7TypeName);

        await handleSaveSchemaChanges();

        // Close the popover first
        setIsOpen(false);

        // Open the drawer after a short delay to ensure the UI has stabilized
        setTimeout(() => {
          setHighlightedVariableKey(variableName);
          setIsPayloadSchemaDrawerOpen(true);
        }, 300);

        // Keep the variable marked as valid for a bit longer to prevent flashing
        setTimeout(() => {
          setJustAddedVariable(null);
        }, 2000);
      } catch (error) {
        showErrorToast('Failed to save new variable to schema: ' + error);
        setJustAddedVariable(null);
      } finally {
        setIsAddingToSchema(false);
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

  // Check if the variable is allowed (exists in schema)
  // Re-evaluate when currentSchema changes to reflect updates
  const isNotInSchema = useMemo(() => {
    if (!name || isAddingToSchema) return false;

    // If this variable was just added, consider it valid
    if (justAddedVariable && name === `payload.${justAddedVariable}`) {
      return false;
    }

    // For payload variables, also check using the schema directly
    if (name.startsWith('payload.')) {
      const propertyKey = name.replace('payload.', '');
      const schemaProperty = getSchemaPropertyByKey(propertyKey);

      if (schemaProperty) {
        return false;
      }
    }

    // Create a variable object with just the name for validation
    const variableToCheck: LiquidVariable = { name };

    return !isAllowedVariable(variableToCheck);
  }, [name, isAllowedVariable, currentSchema, isAddingToSchema, justAddedVariable, getSchemaPropertyByKey]);

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
          isNotInSchema={isNotInSchema}
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
        onSave={() => {
          // Optionally refetch or update data after schema save from drawer
        }}
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
