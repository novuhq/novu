import { type ReactNode, useEffect } from 'react';
import { RiAddLine, RiDeleteBinLine, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import type { JSONSchema7 } from '@/components/schema-editor';
import { SchemaEditor } from '@/components/schema-editor';
import { useSchemaForm } from '@/components/schema-editor/use-schema-form';
import { PayloadImportEditor } from '@/components/workflow-editor/payload-schema/components';
import { useImportSchema } from '@/components/workflow-editor/payload-schema/hooks';

type WebhookRequestSchemaEditorProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payloadSchema?: string;
  onSave: (payloadSchema: string) => void;
  readOnly?: boolean;
};

const EMPTY_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {},
};

function parsePayloadSchema(payloadSchema?: string): JSONSchema7 {
  if (!payloadSchema?.trim()) {
    return EMPTY_SCHEMA;
  }

  try {
    const schema = JSON.parse(payloadSchema);

    return schema && typeof schema === 'object' && !Array.isArray(schema) ? schema : EMPTY_SCHEMA;
  } catch {
    return EMPTY_SCHEMA;
  }
}

export function WebhookRequestSchemaEditor({
  isOpen,
  onOpenChange,
  payloadSchema,
  onSave,
  readOnly = false,
}: WebhookRequestSchemaEditorProps) {
  const schemaForm = useSchemaForm({
    initialSchema: parsePayloadSchema(payloadSchema),
  });
  const {
    isImportMode,
    isLoadingActivity,
    importedPayload,
    payloadNotFound,
    isManualImport,
    setImportedPayload,
    handleImportFromJson,
    handleGenerateSchema,
    handleBackToManual,
  } = useImportSchema(undefined, schemaForm.methods);

  useEffect(() => {
    if (isOpen) {
      schemaForm.resetToSchema(parsePayloadSchema(payloadSchema));
    }
  }, [isOpen, payloadSchema, schemaForm.resetToSchema]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleBackToManual();
    }

    onOpenChange(open);
  };

  const handleSave = () => {
    onSave(JSON.stringify(schemaForm.getCurrentSchema()));
    onOpenChange(false);
  };

  const handleClear = () => {
    onSave('');
    onOpenChange(false);
  };

  const hasProperties = schemaForm.fields.length > 0;
  let editorContent: ReactNode;

  if (isImportMode) {
    editorContent = (
      <PayloadImportEditor
        isLoadingActivity={isLoadingActivity}
        payloadNotFound={payloadNotFound}
        importedPayload={importedPayload}
        onPayloadChange={setImportedPayload}
        onGenerateSchema={handleGenerateSchema}
        onBack={handleBackToManual}
        isManualImport={isManualImport}
      />
    );
  } else if (hasProperties) {
    editorContent = (
      <SchemaEditor
        control={schemaForm.control}
        fields={schemaForm.fields}
        formState={schemaForm.formState}
        addProperty={schemaForm.addProperty}
        removeProperty={schemaForm.removeProperty}
        methods={schemaForm.methods}
        readOnly={readOnly}
      />
    );
  } else {
    editorContent = (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-white p-4 text-center">
        <div className="space-y-1">
          <h3 className="text-text-sub text-label-xs">Schema not added yet</h3>
          <p className="text-text-soft text-paragraph-xs max-w-md">
            Add properties manually or generate a schema from a sample JSON request.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            leadingIcon={RiAddLine}
            onClick={() => schemaForm.addProperty()}
            disabled={readOnly}
          >
            Add property
          </Button>
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="2xs"
            onClick={handleImportFromJson}
            disabled={readOnly}
          >
            Import from JSON object
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="bg-bg-weak flex w-[600px] flex-col p-0 sm:max-w-3xl">
        <SheetHeader className="space-y-1 px-3 py-4">
          <SheetTitle className="text-label-lg">Request schema</SheetTitle>
          <SheetDescription className="text-paragraph-xs mt-0">
            Define the optional JSON schema used to autocomplete this webhook&apos;s request payload in the workflow
            editor.
          </SheetDescription>
        </SheetHeader>

        <SheetMain className="p-3">
          {editorContent}

          <div className="text-text-soft mt-3 flex items-start gap-1.5 text-xs">
            <RiInformation2Line className="mt-0.5 size-3.5 shrink-0" />
            <p>
              This schema is used only for autocomplete. Schemas from all active webhook integrations are merged, and
              type conflicts are flagged in the workflow editor.
            </p>
          </div>
        </SheetMain>

        <SheetFooter className="border-neutral-content-weak mt-auto flex-row justify-between border-t px-3 py-1.5">
          {!readOnly && payloadSchema?.trim() ? (
            <Button
              type="button"
              variant="error"
              mode="ghost"
              size="xs"
              leadingIcon={RiDeleteBinLine}
              onClick={handleClear}
            >
              Clear schema
            </Button>
          ) : (
            <span />
          )}
          {readOnly ? (
            <Button type="button" variant="secondary" mode="outline" size="xs" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              mode="gradient"
              size="xs"
              onClick={handleSave}
              disabled={isImportMode || (hasProperties && !schemaForm.formState.isValid)}
            >
              Save schema
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
