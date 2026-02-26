import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { EditorOverlays } from '@/components/editor-overlays';
import { HtmlEditor } from '@/components/html-editor';
import { FormField } from '@/components/primitives/form/form';
import { CompletionRange } from '@/components/primitives/variable-editor';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { useEnhancedVariableValidation } from '@/hooks/use-enhanced-variable-validation';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { LocalizationResourceEnum } from '@/types/translations';
import { isMailyJson } from '../../../maily/maily-utils';
import { ControlInput } from '../../control-input';
import { useWorkflow } from '../../workflow-provider';
import { useWorkflowSchema } from '../../workflow-schema-provider';

export const EmailBodyHtml = () => {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { control, setValue } = useFormContext();
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
  const resourceId = workflow?.workflowId || '';
  const resourceType = LocalizationResourceEnum.WORKFLOW;
  const { isPayloadSchemaEnabled, currentSchema, getSchemaPropertyByKey } = useWorkflowSchema();
  const { saveForm } = useSaveForm();

  const onChange = useCallback(
    (value: string) => {
      setValue('body', value);
    },
    [setValue]
  );

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    closeSchemaDrawer,
    openSchemaDrawer,
  } = useCreateVariable();

  const variablesSchema = useMemo(
    () => (isPayloadSchemaEnabled && currentSchema ? { ...step?.variables, payload: currentSchema } : step?.variables),
    [isPayloadSchemaEnabled, currentSchema, step?.variables]
  );

  const parsedVariables = useParseVariables(variablesSchema, digestStepBeforeCurrent?.stepId, isPayloadSchemaEnabled);

  const { enhancedIsAllowedVariable } = useEnhancedVariableValidation({
    isAllowedVariable: parsedVariables.isAllowedVariable,
    currentSchema,
    getSchemaPropertyByKey,
  });

  const {
    translationCompletionSource,
    translationPluginExtension,
    selectedTranslation,
    handleTranslationDelete,
    handleTranslationReplaceKey,
    handleTranslationPopoverOpenChange,
    translationTriggerPosition,
    isTranslationPopoverOpen,
    shouldEnableTranslations,
  } = useEditorTranslationOverlay({
    viewRef,
    lastCompletionRef,
    onChange,
    resourceId,
    resourceType,
    isTranslationEnabledOnResource: !!workflow?.isTranslationEnabled,
  });

  const { isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    resourceId,
    resourceType,
    enabled: shouldEnableTranslations && !!resourceId,
  });

  const isTranslationEnabled = shouldEnableTranslations && !isTranslationKeysLoading;

  const extensions = useMemo(() => {
    if (!translationPluginExtension) return [];

    return [translationPluginExtension];
  }, [translationPluginExtension]);

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        const isMaily = isMailyJson(field.value);

        return (
          <HtmlEditor
            viewRef={viewRef}
            lastCompletionRef={lastCompletionRef}
            value={isMaily ? '' : field.value}
            variables={parsedVariables.variables}
            isAllowedVariable={enhancedIsAllowedVariable}
            onChange={field.onChange}
            saveForm={saveForm}
            completionSources={translationCompletionSource}
            isPayloadSchemaEnabled={isPayloadSchemaEnabled}
            isTranslationEnabled={isTranslationEnabled}
            isContextEnabled={true}
            getSchemaPropertyByKey={getSchemaPropertyByKey}
            extensions={extensions}
            digestStepName={digestStepBeforeCurrent?.stepId}
            skipContainerClick={isTranslationPopoverOpen}
            onManageSchemaClick={openSchemaDrawer}
            onCreateNewVariable={handleCreateNewVariable}
            className="max-h-[calc(100%-124px)]"
          >
            <EditorOverlays
              isTranslationPopoverOpen={isTranslationPopoverOpen}
              selectedTranslation={selectedTranslation}
              onTranslationPopoverOpenChange={handleTranslationPopoverOpenChange}
              onTranslationDelete={handleTranslationDelete}
              onTranslationReplaceKey={handleTranslationReplaceKey}
              translationTriggerPosition={translationTriggerPosition}
              translationValueInput={ControlInput}
              variables={parsedVariables.variables}
              isAllowedVariable={enhancedIsAllowedVariable}
              workflow={workflow}
              resourceId={resourceId}
              resourceType={resourceType}
              isPayloadSchemaDrawerOpen={isPayloadSchemaDrawerOpen}
              onPayloadSchemaDrawerOpenChange={(isOpen) => !isOpen && closeSchemaDrawer()}
              highlightedVariableKey={highlightedVariableKey}
              enableTranslations={shouldEnableTranslations}
            />
          </HtmlEditor>
        );
      }}
    />
  );
};
