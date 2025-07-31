import type { IEnvironment, PatchWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Control, FieldArrayWithId, UseFormReturn } from 'react-hook-form';
import type { JSONSchema7, JSONSchema7TypeName } from '@/components/schema-editor/json-schema';
import { useSchemaForm } from '@/components/schema-editor/use-schema-form';
import { convertSchemaToPropertyList } from '@/components/schema-editor/utils';
import type { PropertyListItem, SchemaEditorFormValues } from '@/components/schema-editor/utils/validation-schema';
import { QueryKeys } from '@/utils/query-keys';
import { patchWorkflow } from '../../api/workflows';

interface ExtendedPatchWorkflowDto extends PatchWorkflowDto {
  validatePayload?: boolean;
}

function getSchemaPropertyByKeyInternal(keyPath: string, schema: JSONSchema7 | undefined): JSONSchema7 | undefined {
  if (!schema || typeof schema === 'boolean') {
    return undefined;
  }

  const parts = keyPath
    .split(/[.[\]]/)
    .filter(Boolean)
    .map((part) => {
      const num = parseInt(part, 10);

      if (!isNaN(num) && num >= 0) {
        return num.toString();
      }

      return part.trim();
    });

  let currentSchemaNode: JSONSchema7 | undefined = schema;

  for (const part of parts) {
    if (!currentSchemaNode || typeof currentSchemaNode === 'boolean') {
      return undefined;
    }

    const nodeType = currentSchemaNode.type;

    if (nodeType === 'object') {
      if (currentSchemaNode.properties && currentSchemaNode.properties[part]) {
        currentSchemaNode = currentSchemaNode.properties[part] as JSONSchema7;
      } else {
        // Return undefined for any key not explicitly defined in properties,
        // regardless of additionalProperties value
        return undefined;
      }
    } else if (nodeType === 'array') {
      if (!currentSchemaNode.items || typeof currentSchemaNode.items === 'boolean') {
        return undefined;
      }

      // Assuming the part is an index, but for type fetching, we look at the items schema.
      // If items is an array, we take the first one (tuple-like arrays not fully handled here for simplicity).
      currentSchemaNode = Array.isArray(currentSchemaNode.items)
        ? (currentSchemaNode.items[0] as JSONSchema7)
        : (currentSchemaNode.items as JSONSchema7);
    } else {
      // Path tries to go deeper than possible (e.g., accessing a property of a string)
      return undefined;
    }
  }

  return currentSchemaNode;
}

interface UseWorkflowSchemaManagerProps {
  workflow: WorkflowResponseDto;
  environment: IEnvironment;
  initialSchema?: JSONSchema7;
  onSaveSuccess?: (schema: JSONSchema7) => void;
  onSchemaChange?: (schema: JSONSchema7) => void;
  validatePayload?: boolean;
  onValidatePayloadChange?: (enabled: boolean) => void;
}

export interface UseWorkflowSchemaManagerReturn {
  currentSchema?: JSONSchema7;
  isSchemaValid: boolean;
  handleSaveChanges: () => Promise<void>;
  isSaving: boolean;
  saveError: Error | null;
  addProperty: (propertyData?: Partial<PropertyListItem>, type?: JSONSchema7TypeName) => void;
  removeProperty: (index: number) => void;
  getCurrentSchema: () => JSONSchema7;
  getSchemaPropertyByKey: (keyPath: string) => JSONSchema7 | undefined;
  formMethods: UseFormReturn<SchemaEditorFormValues>;
  control: Control<SchemaEditorFormValues>;
  fields: FieldArrayWithId<SchemaEditorFormValues, 'propertyList', 'fieldId'>[];
  formState: {
    isValid: boolean;
    errors: Record<string, any>;
  };
  validatePayload: boolean;
  setValidatePayload: (enabled: boolean) => void;
}

export function useWorkflowSchemaManager({
  workflow,
  environment,
  initialSchema,
  onSaveSuccess,
  onSchemaChange,
  validatePayload,
  onValidatePayloadChange,
}: UseWorkflowSchemaManagerProps): UseWorkflowSchemaManagerReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [isSchemaValid, setIsSchemaValid] = useState(true);
  const [internalValidatePayload, setInternalValidatePayload] = useState(validatePayload ?? false);
  const queryClient = useQueryClient();
  const lastInitialSchemaRef = useRef<JSONSchema7 | undefined>(initialSchema);

  const schemaForm = useSchemaForm({
    initialSchema,
    onChange: (newSchema) => {
      onSchemaChange?.(newSchema);
    },
    onValidityChange: (isValid) => {
      setIsSchemaValid(isValid);
    },
  });

  // Reset form when initialSchema changes (e.g., when workflow loads)
  useEffect(() => {
    if (initialSchema !== lastInitialSchemaRef.current) {
      lastInitialSchemaRef.current = initialSchema;
      const propertyList = initialSchema?.properties
        ? convertSchemaToPropertyList(initialSchema.properties, initialSchema.required)
        : [];

      schemaForm.methods.reset({
        propertyList,
      });
    }
  }, [initialSchema, schemaForm.methods]);

  // Sync validatePayload prop with internal state
  useEffect(() => {
    setInternalValidatePayload(validatePayload ?? false);
  }, [validatePayload]);

  const getSchemaPropertyByKey = useCallback(
    (keyPath: string): JSONSchema7 | undefined => {
      const currentFullSchema = schemaForm.getCurrentSchema();

      return getSchemaPropertyByKeyInternal(keyPath, currentFullSchema);
    },
    [schemaForm]
  );

  const handleSaveChanges = useCallback(async () => {
    if (!workflow?.slug) {
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

    const workflowUpdatePayload: ExtendedPatchWorkflowDto = {
      payloadSchema: schemaToSave,
      validatePayload: internalValidatePayload,
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

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      onSaveSuccess?.(schemaToSave);
    } catch (error: any) {
      console.error('Failed to save payload schema due to API error:', error);
      setSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [workflow?.slug, environment, schemaForm, onSaveSuccess, isSchemaValid, queryClient, internalValidatePayload]);

  return {
    currentSchema: schemaForm.getCurrentSchema(),
    isSchemaValid,
    handleSaveChanges,
    isSaving,
    saveError,
    addProperty: schemaForm.addProperty,
    removeProperty: schemaForm.removeProperty,
    getCurrentSchema: schemaForm.getCurrentSchema,
    formMethods: schemaForm.methods,
    getSchemaPropertyByKey,
    control: schemaForm.control,
    fields: schemaForm.fields,
    formState: schemaForm.formState,
    validatePayload: internalValidatePayload,
    setValidatePayload: (enabled: boolean) => {
      setInternalValidatePayload(enabled);
      onValidatePayloadChange?.(enabled);
    },
  };
}
