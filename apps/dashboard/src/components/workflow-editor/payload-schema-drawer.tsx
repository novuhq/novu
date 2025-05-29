import { useEffect, useState } from 'react';
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
import { SchemaEditor } from '@/components/schema-editor/schema-editor';
import { useWorkflowSchema } from './workflow-schema-provider';
import type { WorkflowResponseDto } from '@novu/shared';
import { ExternalLink } from '../shared/external-link';
import { TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { TooltipProvider } from '../primitives/tooltip';
import { Tooltip } from '../primitives/tooltip';
import { RiFileMarkedLine, RiInformation2Line, RiAddLine, RiShieldCheckLine } from 'react-icons/ri';
import { Separator } from '../primitives/separator';
import { Link } from 'react-router-dom';
import { SchemaChangeConfirmationModal } from './schema-change-confirmation-modal';
import { detectSchemaChanges, type SchemaChanges } from '../schema-editor/utils/schema-change-detection';
import { checkVariableUsageInWorkflow } from '../schema-editor/utils/check-variable-usage';
import { Switch } from '../primitives/switch';
import { Hint, HintIcon } from '../primitives/hint';

interface PayloadSchemaDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workflow?: WorkflowResponseDto;
  isLoadingWorkflow?: boolean;
  onSave?: (schema: JSONSchema7) => void;
  highlightedPropertyKey?: string | null;
}

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
    validatePayload,
    setValidatePayload,
  } = useWorkflowSchema();

  useEffect(() => {
    if (workflow?.payloadSchema && workflow.payloadSchema !== drawerSchema) {
      setDrawerSchema(workflow.payloadSchema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.payloadSchema]);

  // Store original schema when drawer opens
  useEffect(() => {
    if (isOpen && workflow?.payloadSchema) {
      setOriginalSchema(workflow.payloadSchema);
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

    onOpenChange(open);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="bg-bg-weak flex w-[600px] flex-col p-0 sm:max-w-3xl">
          <SheetHeader className="space-y-1 px-3 py-4">
            <SheetTitle className="text-label-lg">
              Manage workflow schema{' '}
              <Badge color="gray" size="sm" variant="light" className="text-label-xs relative bottom-[1px]">
                BETA
              </Badge>
            </SheetTitle>
            <SheetDescription className="text-paragraph-xs mt-0">
              Manage workflow schema for reliable notifications.{' '}
              <ExternalLink href="https://docs.novu.co/platform/concepts/workflows">Learn more</ExternalLink>
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <SheetMain className="p-0">
            <div className="p-3">
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
                        When enabled, the workflow will validate incoming payloads against the defined schema and reject
                        invalid requests during the trigger http request.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch checked={validatePayload} onCheckedChange={setValidatePayload} disabled={isLoadingWorkflow} />
              </div>

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
              ) : (
                <PayloadSchemaEmptyState onAddProperty={addProperty} />
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
              <Link to="https://docs.novu.co/platform/concepts/payloads" target="_blank">
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
                disabled={!isSchemaValid || isSaving || isLoadingWorkflow}
              >
                Save Changes
              </Button>
            </div>
          </SheetFooter>
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
    </>
  );
}

function PayloadSchemaEmptyState({ onAddProperty }: { onAddProperty: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 bg-white p-4 text-center">
      <div className="mb-6 space-y-2">
        <h3 className="text-text-sub text-label-xs">Your schema starts here</h3>

        <p className="text-text-soft text-paragraph-xs max-w-md">
          Start building your payload schema by typing{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{'{{ }}'}</code> to add variables, or create your
          schema first from this form.
        </p>
      </div>

      <Button variant="secondary" mode="outline" size="2xs" leadingIcon={RiAddLine} onClick={onAddProperty}>
        Add property
      </Button>
    </div>
  );
}
