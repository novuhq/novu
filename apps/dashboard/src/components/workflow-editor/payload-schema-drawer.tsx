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
import { FeatureFlagsKeysEnum, type WorkflowResponseDto } from '@novu/shared';
import { ExternalLink } from '../shared/external-link';
import { TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { TooltipProvider } from '../primitives/tooltip';
import { Tooltip } from '../primitives/tooltip';
import {
  RiFileMarkedLine,
  RiInformation2Line,
  RiAddLine,
  RiShieldCheckLine,
  RiHistoryLine,
  RiArrowLeftLine,
  RiCloseLine,
} from 'react-icons/ri';
import { Separator } from '../primitives/separator';
import { Link } from 'react-router-dom';
import { SchemaChangeConfirmationModal } from './schema-change-confirmation-modal';
import { detectSchemaChanges, type SchemaChanges } from '../schema-editor/utils/schema-change-detection';
import { checkVariableUsageInWorkflow } from '../schema-editor/utils/check-variable-usage';
import { Switch } from '../primitives/switch';
import { Hint, HintIcon } from '../primitives/hint';
import { useFeatureFlag } from '../../hooks/use-feature-flag';
import { LinkButton } from '../primitives/button-link';
import { getActivityList } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
import { Editor } from '@/components/primitives/editor';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { toast } from 'sonner';
import { convertSchemaToPropertyList } from '@/components/schema-editor/utils/schema-converter';
import { v4 as uuidv4 } from 'uuid';

// JSON extensions for the Editor
const jsonExtensions = [loadLanguage('json')?.extension ?? []];

interface PayloadSchemaDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workflow?: WorkflowResponseDto;
  isLoadingWorkflow?: boolean;
  onSave?: (schema: JSONSchema7) => void;
  highlightedPropertyKey?: string | null;
}

// Utility function to generate schema from JSON
function generateSchemaFromJson(jsonData: any): JSONSchema7 {
  function determineSchemaType(value: unknown): JSONSchema7 {
    if (value === null) {
      return { type: 'null' };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? determineSchemaType(value[0]) : { type: 'string' },
      };
    }

    switch (typeof value) {
      case 'string':
        return { type: 'string' };
      case 'number':
        return { type: 'number' };
      case 'boolean':
        return { type: 'boolean' };

      case 'object': {
        const properties: { [key: string]: JSONSchema7 } = {};

        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          properties[key] = determineSchemaType(val);
        }

        return {
          type: 'object',
          properties,
          required: Object.keys(value as Record<string, unknown>),
        };
      }

      default:
        return { type: 'string' };
    }
  }

  const schema = determineSchemaType(jsonData);

  if (schema.type === 'object') {
    return schema;
  }

  // If the root is not an object, wrap it
  return {
    type: 'object',
    properties: {
      payload: schema,
    },
    required: ['payload'],
  };
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
  const isPayloadSchemaFFEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED);

  // Import flow states
  const [isImportMode, setIsImportMode] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [importedPayload, setImportedPayload] = useState<string>('');
  const [payloadNotFound, setPayloadNotFound] = useState(false);

  const { currentEnvironment } = useEnvironment();

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

  // Handler for importing schema from recent payload
  const handleImportSchema = async () => {
    if (!workflow?._id || !currentEnvironment) return;

    setIsImportMode(true);
    setIsLoadingActivity(true);
    setPayloadNotFound(false);

    try {
      const response = await getActivityList({
        environment: currentEnvironment,
        page: 0,
        limit: 1,
        filters: {
          workflows: [workflow._id],
        },
      });

      if (response.data && response.data.length > 0) {
        const recentActivity = response.data[0];
        const payload = recentActivity.payload || {};

        // Remove internal keys that shouldn't be part of the schema
        const cleanPayload = { ...payload };
        delete cleanPayload.__source;
        setImportedPayload(JSON.stringify(cleanPayload, null, 2));
      } else {
        setPayloadNotFound(true);
        setImportedPayload('');
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      toast.error('Failed to fetch recent payloads. Please try again.');
      setPayloadNotFound(true);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Handler for generating schema from JSON
  const handleGenerateSchema = () => {
    try {
      const parsedPayload = JSON.parse(importedPayload);
      const generatedSchema = generateSchemaFromJson(parsedPayload);

      // Convert schema to property list format
      const propertyList = convertSchemaToPropertyList(generatedSchema.properties, generatedSchema.required);

      // Reset the form with the generated property list
      formMethods.reset({
        propertyList,
      });

      // Exit import mode
      setIsImportMode(false);
      setImportedPayload('');
      setPayloadNotFound(false);

      toast.success('Schema generated successfully!');
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format. Please check your payload.');
      } else {
        toast.error('Failed to generate schema. Please try again.');
      }
    }
  };

  // Handler for going back to manual mode
  const handleBackToManual = () => {
    setIsImportMode(false);
    setImportedPayload('');
    setPayloadNotFound(false);
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
                            When enabled, the workflow will validate incoming payloads against the defined schema and
                            reject invalid requests during the trigger http request.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={validatePayload}
                      onCheckedChange={setValidatePayload}
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
                />
              ) : (
                <PayloadSchemaEmptyState
                  onAddProperty={addProperty}
                  isPayloadSchemaEnabled={isPayloadSchemaFFEnabled}
                  hasNoSchema={!workflow?.payloadSchema}
                  onImportSchema={handleImportSchema}
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
                disabled={!isSchemaValid || isSaving || isLoadingWorkflow || isImportMode}
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

function PayloadSchemaEmptyState({
  onAddProperty,
  isPayloadSchemaEnabled,
  hasNoSchema,
  onImportSchema,
}: {
  onAddProperty: () => void;
  isPayloadSchemaEnabled: boolean;
  hasNoSchema: boolean;
  onImportSchema: () => void;
}) {
  const isNewSchemaScenario = isPayloadSchemaEnabled && hasNoSchema;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 bg-white p-4 text-center">
      <div className="mb-6 space-y-2">
        <h3 className="text-text-sub text-label-xs">
          {isNewSchemaScenario ? 'Schema not added yet' : 'Your schema starts here'}
        </h3>

        <p className="text-text-soft text-paragraph-xs max-w-md">
          {isNewSchemaScenario ? (
            "A payload schema hasn't been defined for this workflow yet. You can create one manually or import from recent payloads."
          ) : (
            <>
              Start building your payload schema by typing{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{'{{ }}'}</code> to add variables, or create
              your schema first from this form.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-center">
          <Button variant="secondary" mode="outline" size="2xs" leadingIcon={RiAddLine} onClick={onAddProperty}>
            Add property
          </Button>
        </div>

        {isNewSchemaScenario && (
          <LinkButton className="text-label-xs" underline onClick={onImportSchema}>
            Import schema from recent payload
          </LinkButton>
        )}
      </div>
    </div>
  );
}

function PayloadImportEditor({
  isLoadingActivity,
  payloadNotFound,
  importedPayload,
  onPayloadChange,
  onGenerateSchema,
  onBack,
}: {
  isLoadingActivity: boolean;
  payloadNotFound: boolean;
  importedPayload: string;
  onPayloadChange: (value: string) => void;
  onGenerateSchema: () => void;
  onBack: () => void;
}) {
  const isValidJson = () => {
    if (!importedPayload.trim()) return false;

    try {
      JSON.parse(importedPayload);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoadingActivity) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2">Loading recent payloads...</div>
          <div className="text-xs text-neutral-500">Fetching from activity feed</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="mb-2 flex flex-row items-center justify-between gap-2">
          <h3 className="text-label-xs w-full">Import schema from JSON object</h3>
          <Button variant="secondary" mode="ghost" size="2xs" leadingIcon={RiCloseLine} onClick={onBack}>
            Discard
          </Button>
        </div>

        {/* JSON Editor */}
        <div className="flex-1">
          <Editor
            value={importedPayload}
            onChange={onPayloadChange}
            lang="json"
            extensions={jsonExtensions}
            multiline
            className="h-full min-h-[300px] overflow-auto rounded-lg border border-neutral-200"
            placeholder={JSON.stringify({ example: 'Paste your payload JSON here' }, null, 2)}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <RiInformation2Line className="size-3" />
            {payloadNotFound
              ? 'No recent payload found. Please paste your JSON above.'
              : 'Using data from the most recent workflow trigger.'}
          </div>
          <Button variant="secondary" mode="outline" size="2xs" onClick={onGenerateSchema} disabled={!isValidJson()}>
            Generate schema
          </Button>
        </div>
      </div>
    </>
  );
}
