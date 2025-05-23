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
import { SchemaEditor } from '@/components/schema-editor/schema-editor';
import { useWorkflowSchema } from './workflow-schema-provider';
import type { WorkflowResponseDto } from '@novu/shared';
import { ExternalLink } from '../shared/external-link';
import { TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { TooltipProvider } from '../primitives/tooltip';
import { Tooltip } from '../primitives/tooltip';
import { RiFileMarkedLine, RiInformation2Line } from 'react-icons/ri';
import { Separator } from '../primitives/separator';
import { Link } from 'react-router-dom';

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

  const {
    currentSchema,
    isSchemaValid,
    handleSaveChanges,
    isSaving,
    saveError,
    formMethods,
    control,
    fields,
    formState,
    addProperty,
    removeProperty,
  } = useWorkflowSchema();

  useEffect(() => {
    if (workflow?.payloadSchema && workflow.payloadSchema !== drawerSchema) {
      setDrawerSchema(workflow.payloadSchema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.payloadSchema]);

  useEffect(() => {
    if (saveError) {
      console.error('Failed to save payload schema:', saveError.message);
    }
  }, [saveError]);

  const handleSaveWithCallback = async () => {
    await handleSaveChanges();

    if (currentSchema) {
      onSave?.(currentSchema);
    }

    onOpenChange(false);
  };

  if (!workflow && isOpen) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-[600px] sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Payload Schema</SheetTitle>
          </SheetHeader>
          <SheetMain>
            <div className="flex h-full items-center justify-center">Loading...</div>
          </SheetMain>
        </SheetContent>
      </Sheet>
    );
  }

  if (!workflow || !isOpen) return null;

  return (
    <Sheet open={isOpen} modal={false} onOpenChange={onOpenChange}>
      <SheetContent className="bg-bg-weak flex w-[600px] flex-col p-0 sm:max-w-3xl">
        <SheetHeader className="space-y-1 px-3 py-4">
          <SheetTitle className="text-label-lg">Manage Payload Schema</SheetTitle>
          <SheetDescription className="text-paragraph-xs mt-0">
            Define the structure of your workflow payload.{' '}
            <ExternalLink href="https://docs.novu.co/platform/concepts/workflows">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <SheetMain className="p-3">
          <div className="mb-2 flex flex-row items-center justify-between gap-2">
            <h3 className="text-label-xs w-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                    Payload schema <RiInformation2Line className="inline-block size-4 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Validating the workflow payload content, to match a specific schema. This validation ensures
                      content consistency.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
          </div>

          {isLoadingWorkflow ? (
            <div className="flex h-full items-center justify-center">Loading workflow schema...</div>
          ) : (
            <SchemaEditor
              key={workflow.slug}
              control={control}
              fields={fields}
              formState={formState}
              addProperty={addProperty}
              removeProperty={removeProperty}
              methods={formMethods}
              highlightedPropertyKey={highlightedPropertyKey}
            />
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
              onClick={handleSaveWithCallback}
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
  );
}
