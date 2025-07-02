import { HTMLAttributes, useCallback, useMemo, useState } from 'react';
import { Editor } from '@maily-to/core';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { Editor as TiptapEditorReact } from '@tiptap/react';

import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { cn } from '@/utils/ui';
import { createEditorBlocks, createExtensions, DEFAULT_EDITOR_CONFIG, MAILY_EMAIL_WIDTH } from './maily-config';
import { calculateVariables, VariableFrom } from './variables/variables';
import { RepeatMenuDescription } from './views/repeat-menu-description';
import { useRemoveGrammarly } from '@/hooks/use-remove-grammarly';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { FeatureFlagsKeysEnum } from '@novu/shared';

type MailyProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
};

export const Maily = ({ value, onChange, className, ...rest }: MailyProps) => {
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
  const {
    addProperty: addSchemaProperty,
    handleSaveChanges: handleSaveSchemaChanges,
    isPayloadSchemaEnabled,
    currentSchema,
  } = useWorkflowSchema();

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  // Use currentSchema if available (when payload schema is enabled), otherwise fall back to step variables
  const schemaToUse = useMemo(
    () => (isPayloadSchemaEnabled && currentSchema ? { ...step?.variables, payload: currentSchema } : step?.variables),
    [isPayloadSchemaEnabled, currentSchema, step?.variables]
  );

  const parsedVariables = useParseVariables(schemaToUse, digestStepBeforeCurrent?.stepId, isPayloadSchemaEnabled);

  const primitives = useMemo(
    () => parsedVariables.primitives.map((v) => ({ name: v.name, required: false })),
    [parsedVariables.primitives]
  );
  const arrays = useMemo(
    () => parsedVariables.arrays.map((v) => ({ name: v.name, required: false })),
    [parsedVariables.arrays]
  );
  const namespaces = useMemo(
    () => parsedVariables.namespaces.map((v) => ({ name: v.name, required: false })),
    [parsedVariables.namespaces]
  );

  const [_, setEditor] = useState<any>();
  const track = useTelemetry();

  const blocks = useMemo(() => {
    return createEditorBlocks({ track, digestStepBeforeCurrent });
  }, [digestStepBeforeCurrent, track]);

  const editorParentRef = useRemoveGrammarly<HTMLDivElement>();

  const handleCalculateVariables = useCallback(
    ({ query, editor, from }: { query: string; editor: TiptapEditor; from: VariableFrom }) => {
      return calculateVariables({
        query,
        editor,
        from,
        primitives,
        arrays,
        namespaces,
        isAllowedVariable: parsedVariables.isAllowedVariable,
        addDigestVariables: !!digestStepBeforeCurrent?.stepId,
        isPayloadSchemaEnabled,
      });
    },
    [
      primitives,
      arrays,
      namespaces,
      parsedVariables.isAllowedVariable,
      digestStepBeforeCurrent?.stepId,
      isPayloadSchemaEnabled,
    ]
  );

  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);

  const { translationKeys, isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    workflowId: workflow?._id || '',
    enabled: isTranslationEnabled && !!workflow?._id,
  });

  const createTranslationKeyMutation = useCreateTranslationKey();

  const handleCreateNewTranslationKey = useCallback(
    async (translationKey: string) => {
      if (!workflow?._id) return;

      await createTranslationKeyMutation.mutateAsync({
        workflowId: workflow._id,
        translationKey,
        defaultValue: `[${translationKey}]`, // Placeholder value to indicate missing translation
      });
    },
    [workflow?._id, createTranslationKeyMutation]
  );

  // Create a key that changes when variables or translation state changes to force extension recreation
  const variablesKey = useMemo(() => {
    const variableNames = [...parsedVariables.primitives, ...parsedVariables.arrays, ...parsedVariables.namespaces]
      .map((v) => v.name)
      .sort()
      .join(',');

    // Include translation state to force re-mount when translation extension becomes ready
    const translationState = `translation-${isTranslationEnabled ? 'enabled' : 'disabled'}-${isTranslationKeysLoading ? 'loading' : 'loaded'}-${translationKeys.length}`;

    return `vars-${variableNames.length}-${variableNames.slice(0, 100)}-${translationState}`;
  }, [
    parsedVariables.primitives,
    parsedVariables.arrays,
    parsedVariables.namespaces,
    isTranslationEnabled,
    isTranslationKeysLoading,
    translationKeys.length,
  ]);

  const extensions = useMemo(
    () =>
      createExtensions({
        handleCalculateVariables,
        parsedVariables,
        blocks,
        onCreateNewVariable: handleCreateNewVariable,
        isPayloadSchemaEnabled,
        isTranslationEnabled: isTranslationEnabled && !isTranslationKeysLoading,
        translationKeys,
        onCreateNewTranslationKey: handleCreateNewTranslationKey,
      }),
    [
      handleCalculateVariables,
      parsedVariables,
      blocks,
      isPayloadSchemaEnabled,
      handleCreateNewVariable,
      isTranslationEnabled,
      isTranslationKeysLoading,
      translationKeys,
      handleCreateNewTranslationKey,
    ]
  );

  /*
   * Override Maily tippy box styles as a temporary solution.
   * Note: These styles affect both the bubble menu and block manipulation buttons (drag & drop, add).
   * TODO: Request Maily to expose these components or provide specific CSS selectors for individual targeting.
   */
  const overrideTippyBoxStyles = () => (
    <style>
      {`
          [data-tippy-root] {
            z-index: 50 !important;
          }
          .tippy-box {
            padding-right: 20px;
            pointer-events: auto;

            .mly-cursor-grab {
              background-color: #fff;
              border-radius: 4px;
              box-shadow: 0px 0px 2px 0px rgba(0, 0, 0, 0.04), 0px 1px 2px 0px rgba(0, 0, 0, 0.02);
              border-radius: 4px;
              margin: 2px;
            }
          }
        `}
    </style>
  );

  const repeatMenuConfig = useMemo(() => {
    return {
      description: (editor: TiptapEditorReact) => <RepeatMenuDescription editor={editor} />,
    };
  }, []);

  const onUpdate = useCallback(
    (editor: TiptapEditorReact) => {
      setEditor(editor);

      if (onChange) {
        onChange(JSON.stringify(editor.getJSON()));
      }
    },
    [onChange]
  );

  return (
    <div className="relative h-full flex-1 overflow-y-auto bg-neutral-50 px-16 pt-8">
      {overrideTippyBoxStyles()}
      <div
        ref={editorParentRef}
        className={cn(
          `shadow-xs mx-auto flex min-h-full max-w-[${MAILY_EMAIL_WIDTH}px] flex-col items-start rounded-lg bg-white [&_a]:pointer-events-none`,
          className
        )}
        data-gramm={false}
        data-gramm_editor={false}
        data-enable-grammarly="false"
        aria-autocomplete="none"
        aria-multiline={false}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
      >
        <Editor
          key={`${variablesKey}-repeat-block-enabled`}
          config={DEFAULT_EDITOR_CONFIG}
          blocks={blocks}
          extensions={extensions}
          contentJson={value ? JSON.parse(value) : undefined}
          onCreate={setEditor}
          onUpdate={onUpdate}
          repeatMenuConfig={repeatMenuConfig}
        />
      </div>
      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeSchemaDrawer();
          }
        }}
        workflow={workflow}
        highlightedPropertyKey={highlightedVariableKey}
      />
    </div>
  );
};
