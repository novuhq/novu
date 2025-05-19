import { useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useSchemaForm } from '@/components/schema-editor/use-schema-form';
import type { JSONSchema7, JSONSchema7TypeName } from '@/components/schema-editor/json-schema';
import type { SchemaEditorFormValues, PropertyListItem } from '@/components/schema-editor/utils/validation-schema';
import { patchWorkflow } from '../../api/workflows';
import type { WorkflowResponseDto, IEnvironment, PatchWorkflowDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';

interface UseWorkflowSchemaManagerProps {
  workflow: WorkflowResponseDto;
  environment: IEnvironment;
  initialSchema?: JSONSchema7;
  onSaveSuccess?: (schema: JSONSchema7) => void;
  onSchemaChange?: (schema: JSONSchema7) => void;
}

interface UseWorkflowSchemaManagerReturn {
  currentSchema?: JSONSchema7;
  isSchemaValid: boolean;
  handleSaveChanges: () => Promise<void>;
  isSaving: boolean;
  saveError: Error | null;
  addProperty: (propertyData?: Partial<PropertyListItem>, type?: JSONSchema7TypeName) => void;
  removeProperty: (index: number) => void;
  getCurrentSchema: () => JSONSchema7;
  formMethods: UseFormReturn<SchemaEditorFormValues>;
}

export function useWorkflowSchemaManager({
  workflow,
  environment,
  initialSchema,
  onSaveSuccess,
  onSchemaChange,
}: UseWorkflowSchemaManagerProps): UseWorkflowSchemaManagerReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [internalSchema, setInternalSchema] = useState<JSONSchema7 | undefined>(initialSchema);
  const [isSchemaValid, setIsSchemaValid] = useState(true);
  const queryClient = useQueryClient();

  const schemaForm = useSchemaForm({
    initialSchema,
    onChange: (newSchema) => {
      setInternalSchema(newSchema);
      onSchemaChange?.(newSchema);
    },
    onValidityChange: (isValid) => {
      setIsSchemaValid(isValid);
    },
  });

  const handleSaveChanges = useCallback(async () => {
    if (!workflow.slug) {
      console.error('Workflow slug is missing. Cannot save.');
      setSaveError(new Error('Workflow slug is missing.'));
      return;
    }

    if (!environment || !environment._id) {
      console.error('Environment is missing or invalid. Cannot save.');
      setSaveError(new Error('Environment is missing or invalid.'));
      return;
    }

    if (!isSchemaValid) {
      console.error('Schema is invalid. Cannot save.');
      setSaveError(new Error('Schema is invalid.'));
      return;
    }

    const schemaToSave = schemaForm.getCurrentSchema();

    const workflowUpdatePayload: PatchWorkflowDto = {
      payloadSchema: schemaToSave as any,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      await patchWorkflow({
        workflowSlug: workflow.slug,
        environment,
        workflow: workflowUpdatePayload,
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchWorkflow],
      });

      onSaveSuccess?.(schemaToSave);
    } catch (error: any) {
      console.error('Failed to save payload schema due to API error:', error);
      setSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [workflow.slug, environment, schemaForm, onSaveSuccess, isSchemaValid, queryClient]);

  return {
    currentSchema: internalSchema,
    isSchemaValid,
    handleSaveChanges,
    isSaving,
    saveError,
    addProperty: schemaForm.addProperty,
    removeProperty: schemaForm.removeProperty,
    getCurrentSchema: schemaForm.getCurrentSchema,
    formMethods: schemaForm.methods,
  };
}
