import { useEffect, useState, useCallback, useMemo } from 'react';
import type { JSONSchema7 } from '@/components/schema-editor/json-schema';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { SchemaEditor } from '@/components/schema-editor/schema-editor';
import { convertSchemaToPropertyList } from '@/components/schema-editor/utils';
import { useWorkflowSchema } from './workflow-schema-provider';
import { FeatureFlagsKeysEnum, type WorkflowResponseDto } from '@novu/shared';
import { ExternalLink } from '../shared/external-link';
import { TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { Tooltip } from '../primitives/tooltip';
import { RiFileMarkedLine, RiInformation2Line, RiShieldCheckLine } from 'react-icons/ri';
import { Separator } from '../primitives/separator';
import { Link } from 'react-router-dom';
import { SchemaChangeConfirmationModal } from './schema-change-confirmation-modal';
import { detectSchemaChanges, type SchemaChanges } from '../schema-editor/utils/schema-change-detection';
import { checkVariableUsageInWorkflow } from '../schema-editor/utils/check-variable-usage';
import { Switch } from '../primitives/switch';
import { Hint, HintIcon } from '../primitives/hint';
import { useFeatureFlag } from '../../hooks/use-feature-flag';
import { useFormProtection } from '../../hooks/use-form-protection';
import { PayloadSchemaEmptyState, PayloadImportEditor } from './payload-schema/components';
import { useImportSchema } from './payload-schema/hooks';
import { useForm, FormProvider } from 'react-hook-form';

type PayloadSchemaDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workflow?: WorkflowResponseDto;
  isLoadingWorkflow?: boolean;
  onSave?: (schema: JSONSchema7) => void;
  highlightedPropertyKey?: string | null;
};

type PayloadSchemaFormData = {
  validatePayload: boolean;
};

export function PayloadSchemaDrawer({
  isOpen,
  onOpenChange,
  workflow,
  isLoadingWorkflow,
  onSave,
  highlightedPropertyKey,
}: PayloadSchemaDrawerProps) {
  const [drawerSchema, setDrawerSchema] = useState<JSONSchema7 | undefined>(workflow?.payloadSchema);
  const [originalSchema, setOriginalSchema] = useState<JSONSchema7 | undefined>();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<SchemaChanges | null>(null);
  const isPayloadSchemaFFEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED);

  const {
    currentSchema,
    isSchemaValid,
    handleSaveChanges,
    isSaving,
    formMethods,
    control,
    fields,
    formState,
    addProperty,
    removeProperty,
    setValidatePayload,
  } = useWorkflowSchema();

  // Form for the payload schema drawer that includes validatePayload
  const payloadSchemaForm = useForm<PayloadSchemaFormData>({
    defaultValues: {
      validatePayload: workflow?.validatePayload ?? false,
    },
  });

  // Reset form when workflow changes
  useEffect(() => {
    if (workflow) {
      payloadSchemaForm.reset({
        validatePayload: workflow.validatePayload ?? false,
      });
    }
  }, [workflow, payloadSchemaForm]);

  // Custom onValueChange that resets both forms when discarding changes
  const handleFormProtectedValueChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset the schema form to original state
        const propertyList = originalSchema?.properties
          ? convertSchemaToPropertyList(originalSchema.properties, originalSchema.required)
          : [];

        formMethods.reset({ propertyList });

        // Reset the payload schema form
        payloadSchemaForm.reset({
          validatePayload: workflow?.validatePayload ?? false,
        });

        // Reset the validatePayload state in the workflow schema
        setValidatePayload(workflow?.validatePayload ?? false);
      }

      onOpenChange(open);
    },
    [onOpenChange, originalSchema, formMethods, payloadSchemaForm, workflow?.validatePayload, setValidatePayload]
  );

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: handleFormProtectedValueChange,
  });

  const {
    isImportMode,
    isLoadingActivity,
    importedPayload,
    payloadNotFound,
    isManualImport,
    setImportedPayload,
    handleImportSchema,
    handleImportFromJson,
    handleGenerateSchema,
    handleBackToManual,
  } = useImportSchema(workflow, formMethods);

  useEffect(() => {
    if (workflow?.payloadSchema && workflow.payloadSchema !== drawerSchema) {
      setDrawerSchema(workflow.payloadSchema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.payloadSchema]);

  // Store original schema when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (workflow?.payloadSchema) {
        setOriginalSchema(workflow.payloadSchema);
      }
    }
  }, [isOpen, workflow?.payloadSchema]);

  const handleSaveWithValidation = async () => {
    if (!originalSchema || !currentSchema) {
      await handleSaveWithCallback();
      return;
    }

    // Detect changes
    const changes = detectSchemaChanges(originalSchema, currentSchema, (key) =>
      checkVariableUsageInWorkflow(key, workflow?.steps || [])
    );

    if (changes.hasUsedVariableChanges) {
      setPendingChanges(changes);
      setShowConfirmationModal(true);
    } else {
      await handleSaveWithCallback();
    }
  };

  const handleSaveWithCallback = async () => {
    await handleSaveChanges();

    if (currentSchema) {
      onSave?.(currentSchema);
    }

    onOpenChange(false);
  };

  const handleConfirmChanges = async () => {
    setShowConfirmationModal(false);
    await handleSaveWithCallback();
    setPendingChanges(null);
  };

  const handleCancelChanges = () => {
    setShowConfirmationModal(false);
    setPendingChanges(null);
  };

  // Check if there are any fields in the form or if the workflow has a payload schema
  const hasPayloadSchema =
    fields.length > 0 || (workflow?.payloadSchema && Object.keys(workflow.payloadSchema.properties || {}).length > 0);

  const handleSheetOpenChange = (open: boolean) => {
    // Prevent closing the sheet when the confirmation modal is open
    if (!open && showConfirmationModal) {
      return;
    }

    protectedOnValueChange(open);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent ref={protectionRef} className="bg-bg-weak flex w-[600px] flex-col p-0 sm:max-w-3xl">
          <FormProvider {...payloadSchemaForm}>
            <FormRoot className="flex h-full flex-col">
              <SheetHeader className="space-y-1 px-3 py-4">
                <SheetTitle className="text-label-lg">
                  Manage workflow schema{' '}
                  <Badge color="gray" size="sm" variant="light" className="text-label-xs relative bottom-[1px]">
                    BETA
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-paragraph-xs mt-0">
                  Manage workflow schema for reliable notifications.{' '}
                  <ExternalLink href="https://docs.novu.co/platform/workflow/build-a-workflow#manage-payload-schema">
                    Learn more
                  </ExternalLink>
                </SheetDescription>
              </SheetHeader>
              <Separator />
              <SheetMain className="p-0">
                <div className="p-3">
                  {!isImportMode && (
                    <>
                      <div className="mb-2 flex flex-row items-center justify-between gap-2">
                        <h3 className="text-label-xs w-full">Payload schema</h3>
                      </div>
                      <div className="rounded-4 border-1 mb-2 flex items-center justify-between border border-neutral-100 bg-white p-1.5">
                        <div className="text-text-strong text-label-xs flex items-center gap-1">
                          <RiShieldCheckLine className="text-text-strong size-3" />
                          Enforce schema validation
                          <Tooltip>
                            <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                              <RiInformation2Line className="size-3 text-neutral-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                When enabled, the workflow will validate incoming payloads against the defined schema
                                and reject invalid requests during the trigger http request.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={payloadSchemaForm.watch('validatePayload')}
                          onCheckedChange={(value) => {
                            payloadSchemaForm.setValue('validatePayload', value, { shouldDirty: true });
                            setValidatePayload(value);
                          }}
                          disabled={isLoadingWorkflow}
                        />
                      </div>
                    </>
                  )}

                  {isLoadingWorkflow ? (
                    <div className="flex h-full items-center justify-center">Loading workflow schema...</div>
                  ) : hasPayloadSchema ? (
                    <SchemaEditor
                      key={workflow?.slug}
                      control={control}
                      fields={fields}
                      formState={formState}
                      addProperty={addProperty}
                      removeProperty={removeProperty}
                      methods={formMethods}
                      highlightedPropertyKey={highlightedPropertyKey}
                    />
                  ) : isImportMode ? (
                    <PayloadImportEditor
                      isLoadingActivity={isLoadingActivity}
                      payloadNotFound={payloadNotFound}
                      importedPayload={importedPayload}
                      onPayloadChange={setImportedPayload}
                      onGenerateSchema={handleGenerateSchema}
                      onBack={handleBackToManual}
                      isManualImport={isManualImport}
                    />
                  ) : (
                    <PayloadSchemaEmptyState
                      onAddProperty={addProperty}
                      isPayloadSchemaEnabled={isPayloadSchemaFFEnabled}
                      hasNoSchema={!workflow?.payloadSchema}
                      onImportSchema={handleImportSchema}
                      onImportFromJson={handleImportFromJson}
                    />
                  )}
                </div>

                {hasPayloadSchema && (
                  <>
                    <Separator />
                    <Hint className="text-text-soft p-2 px-3">
                      <HintIcon as={RiInformation2Line} />
                      Modifying a variable&apos;s type can break step behavior if the variable is used in logic or
                      expressions.
                    </Hint>
                  </>
                )}
              </SheetMain>
              <SheetFooter className="border-neutral-content-weak space-between flex border-t px-3 py-1.5">
                <div className="flex w-full flex-row items-center justify-between gap-2">
                  <Link
                    to="https://docs.novu.co/platform/workflow/build-a-workflow#manage-payload-schema"
                    target="_blank"
                  >
                    <Button variant="secondary" mode="ghost" size="xs" leadingIcon={RiFileMarkedLine}>
                      View Docs
                    </Button>
                  </Link>
                  <Button
                    size="xs"
                    mode="gradient"
                    variant="secondary"
                    onClick={handleSaveWithValidation}
                    isLoading={isSaving}
                    data-test-id="save-payload-schema-btn"
                    disabled={!isSchemaValid || !formState.isValid || isSaving || isLoadingWorkflow || isImportMode}
                  >
                    Save Changes
                  </Button>
                </div>
              </SheetFooter>
            </FormRoot>
          </FormProvider>
        </SheetContent>
      </Sheet>

      {pendingChanges && (
        <SchemaChangeConfirmationModal
          isOpen={showConfirmationModal}
          onClose={handleCancelChanges}
          onConfirm={handleConfirmChanges}
          changes={pendingChanges}
        />
      )}

      {ProtectionAlert}
    </>
  );
}
