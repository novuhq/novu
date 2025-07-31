import { useCallback, useState } from 'react';
import { RiListView } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import type { JSONSchema7TypeName } from '@/components/schema-editor/json-schema';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';

export const useCreateVariable = () => {
  const { workflow } = useWorkflow();
  const {
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
          children: () => {
            const handleManageSchemaClick = () => setIsPayloadSchemaDrawerOpen(true);

            return (
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
                  onClick={handleManageSchemaClick}
                  className="shrink-0"
                >
                  Manage schema
                </Button>
              </div>
            );
          },
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

  const openSchemaDrawer = useCallback((variableName?: string) => {
    if (variableName) {
      setHighlightedVariableKey(variableName);
    }

    setIsPayloadSchemaDrawerOpen(true);
  }, []);

  const closeSchemaDrawer = useCallback(() => {
    setIsPayloadSchemaDrawerOpen(false);
    setHighlightedVariableKey(null);
  }, []);

  return {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  };
};
