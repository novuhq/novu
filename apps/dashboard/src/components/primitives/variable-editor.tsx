import { cn } from '@/utils/ui';
import { autocompletion, CompletionSource } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { Editor, EditorProps } from '@/components/primitives/editor';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { EditTranslationPopover } from '@/components/workflow-editor/steps/email/translations/edit-translation-popover/edit-translation-popover';
import { CompletionOption, createAutocompleteSource } from '@/utils/liquid-autocomplete';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useVariables } from './control-input/hooks/use-variables';
import { useTranslations } from './control-input/hooks/use-translations';
import { createVariableExtension } from './control-input/variable-plugin';
import { createTranslationExtension } from './control-input/translation-plugin';
import { variablePillTheme } from './control-input/variable-plugin/variable-theme';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DIGEST_VARIABLES_FILTER_MAP } from '@/components/variable/utils/digest-variables';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { useCreateVariable } from '../variable/hooks/use-create-variable';
import { DEFAULT_SIDE_OFFSET } from './popover';
import { DEFAULT_VARIABLE_PILL_HEIGHT } from './control-input/variable-plugin/variable-pill-widget';
import { useFetchTranslationKeys } from '@/hooks/use-fetch-translation-keys';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { createTranslationAutocompleteSource } from './control-input/translation-plugin/autocomplete';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { TRANSLATION_PILL_HEIGHT } from './control-input/translation-plugin/constants';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type CompletionRange = {
  from: number;
  to: number;
};

type VariableEditorProps = {
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  autoFocus?: boolean;
  id?: string;
  indentWithTab?: boolean;
  completionSources?: CompletionSource[];
  enableTranslations?: boolean;
} & Pick<
  EditorProps,
  | 'className'
  | 'placeholder'
  | 'value'
  | 'onChange'
  | 'onBlur'
  | 'multiline'
  | 'size'
  | 'fontFamily'
  | 'foldGutter'
  | 'lineNumbers'
  | 'extensions'
  | 'tagStyles'
>;

export function VariableEditor({
  value,
  onChange = () => {},
  onBlur = () => {},
  variables,
  className,
  placeholder,
  autoFocus,
  id,
  multiline = false,
  size = 'sm',
  indentWithTab,
  isAllowedVariable,
  fontFamily,
  lineNumbers = false,
  foldGutter = false,
  extensions,
  tagStyles,
  completionSources,
  enableTranslations = true,
}: VariableEditorProps) {
  const isCustomHtmlEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED);
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedVariable, setSelectedVariable, handleVariableSelect, handleVariableUpdate } = useVariables(
    viewRef,
    onChange
  );

  // Always call the hook, but it will be ignored if translations are disabled
  const {
    selectedTranslation,
    setSelectedTranslation,
    handleTranslationSelect,
    handleTranslationDelete,
    handleTranslationReplaceKey,
  } = useTranslations(viewRef, onChange);

  const isVariablePopoverOpen = !!selectedVariable;
  const isTranslationPopoverOpen = enableTranslations && !!selectedTranslation;
  const variable: LiquidVariable | undefined = selectedVariable
    ? {
        name: selectedVariable.value,
      }
    : undefined;

  const { digestStepBeforeCurrent, workflow } = useWorkflow();
  const track = useTelemetry();

  // Translation keys for autocompletion - only fetch if translations are enabled
  const { translationKeys, isLoading: isTranslationKeysLoading } = useFetchTranslationKeys({
    workflowId: workflow?._id || '',
    enabled: enableTranslations && !!workflow?._id,
  });

  const createTranslationKeyMutation = useCreateTranslationKey();

  const { getSchemaPropertyByKey, isPayloadSchemaEnabled, currentSchema } = useWorkflowSchema();

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  const [variableTriggerPosition, setVariableTriggerPosition] = useState<{ top: number; left: number } | null>(null);
  const [translationTriggerPosition, setTranslationTriggerPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  // Create an enhanced isAllowedVariable that also checks the current schema
  const enhancedIsAllowedVariable = useCallback(
    (variable: LiquidVariable): boolean => {
      // First check with the original isAllowedVariable
      if (isAllowedVariable(variable)) {
        return true;
      }

      // If not allowed by original function, check if it exists in the current schema
      if (variable.name.startsWith('payload.') && currentSchema) {
        const propertyKey = variable.name.replace('payload.', '');
        return !!getSchemaPropertyByKey(propertyKey);
      }

      return false;
    },
    [isAllowedVariable, currentSchema, getSchemaPropertyByKey]
  );

  const onVariableSelect = useCallback(
    (completion: CompletionOption) => {
      if (completion.isNewVariable && completion.label.startsWith('payload.')) {
        handleCreateNewVariable(completion.label.replace('payload.', ''));
      }

      if (completion.type === 'digest') {
        const parts = completion.displayLabel?.split('.');
        const lastElement = parts?.[parts.length - 1];

        if (lastElement && lastElement in DIGEST_VARIABLES_FILTER_MAP) {
          track(TelemetryEvent.DIGEST_VARIABLE_SELECTED, {
            variable: lastElement,
          });
        }
      }
    },
    [track, handleCreateNewVariable]
  );

  const variableCompletionSource = useMemo(() => {
    return createAutocompleteSource(variables, onVariableSelect, handleCreateNewVariable, isPayloadSchemaEnabled);
  }, [variables, onVariableSelect, handleCreateNewVariable, isPayloadSchemaEnabled]);

  const translationCompletionSource = useMemo(() => {
    if (!enableTranslations) return null;

    return createTranslationAutocompleteSource({
      translationKeys,
      onCreateNewTranslationKey: async (translationKey: string) => {
        if (!workflow?._id) return;

        try {
          await createTranslationKeyMutation.mutateAsync({
            workflowId: workflow._id,
            translationKey,
            defaultValue: `[${translationKey}]`,
          });
        } catch {
          showErrorToast('Failed to create translation key');
        }
      },
    });
  }, [translationKeys, createTranslationKeyMutation, workflow?._id, enableTranslations]);

  const autocompletionExtension = useMemo(() => {
    const sources = [variableCompletionSource];

    if (enableTranslations && translationCompletionSource) {
      sources.push(translationCompletionSource);
    }

    if (completionSources) {
      sources.push(...completionSources);
    }

    return autocompletion({
      override: sources,
      closeOnBlur: true,
      defaultKeymap: true,
      activateOnTyping: true,
      optionClass: (completion) => {
        if (completion.type === 'new-variable') return 'cm-new-variable-option';
        if (completion.type === 'new-translation-key') return 'cm-new-translation-option';
        return '';
      },
    });
  }, [variableCompletionSource, translationCompletionSource, completionSources, enableTranslations]);

  const isDigestEventsVariable = useCallback(
    (variableName: string) => {
      const { value } = getDynamicDigestVariable({
        type: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
        digestStepName: digestStepBeforeCurrent?.stepId,
      });

      if (!value) return false;

      const valueWithoutFilters = value.split('|')[0].trim();
      return variableName === valueWithoutFilters;
    },
    [digestStepBeforeCurrent?.stepId]
  );

  const variablePluginExtension = useMemo(() => {
    return createVariableExtension({
      viewRef,
      lastCompletionRef,
      onSelect: handleVariableSelect,
      isAllowedVariable: enhancedIsAllowedVariable,
      isDigestEventsVariable,
      isCustomHtmlEditorEnabled,
    });
  }, [isCustomHtmlEditorEnabled, handleVariableSelect, enhancedIsAllowedVariable, isDigestEventsVariable]);

  const translationPluginExtension = useMemo(() => {
    if (!enableTranslations) return null;

    return createTranslationExtension({
      viewRef,
      lastCompletionRef,
      onSelect: handleTranslationSelect,
      translationKeys,
      isTranslationKeysLoading,
    });
  }, [handleTranslationSelect, translationKeys, isTranslationKeysLoading, enableTranslations]);

  const editorExtensions = useMemo(() => {
    const baseExtensions = [...(multiline ? [EditorView.lineWrapping] : []), variablePillTheme];
    const allExtensions = [...baseExtensions, autocompletionExtension, variablePluginExtension];

    if (enableTranslations && translationPluginExtension) {
      allExtensions.push(translationPluginExtension);
    }

    if (extensions) {
      allExtensions.push(...extensions);
    }

    return allExtensions;
  }, [
    autocompletionExtension,
    variablePluginExtension,
    translationPluginExtension,
    multiline,
    extensions,
    enableTranslations,
  ]);

  const handleVariablePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setTimeout(() => setSelectedVariable(null), 0);
        viewRef.current?.focus();
      }
    },
    [setSelectedVariable]
  );

  const handleTranslationPopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!enableTranslations) return;

      if (!open) {
        setTimeout(() => setSelectedTranslation(null), 0);
        viewRef.current?.focus();
      }
    },
    [setSelectedTranslation, enableTranslations]
  );

  /**
   * This is a workaround to focus the editor when clicking on the container.
   * It's a known issue with Codemirror in case of the container is bigger in size than a single focusable row.
   */
  const handleContainerClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // Don't focus if a variable popover is open or if clicking on interactive elements
      if (isVariablePopoverOpen || isTranslationPopoverOpen) return;

      const target = event.target as HTMLElement;

      // Don't focus if clicking on variable pills, translation pills, or other interactive elements
      if (
        target.closest('.cm-variable-pill') ||
        target.closest('.cm-translation-pill') ||
        target.closest('[role="button"]') ||
        target.closest('button')
      ) {
        return;
      }

      // Only programmatically focus if clicking directly on the container
      if (viewRef.current) {
        viewRef.current.focus();
      }
    },
    [isVariablePopoverOpen, isTranslationPopoverOpen]
  );

  useEffect(() => {
    // calculate variable popover trigger position when variable is selected
    if (selectedVariable && viewRef.current && containerRef.current) {
      const coords = viewRef.current.coordsAtPos(selectedVariable.from);
      const containerRect = containerRef.current.getBoundingClientRect();

      const topOffset = DEFAULT_VARIABLE_PILL_HEIGHT - DEFAULT_SIDE_OFFSET + 2;

      if (coords) {
        setVariableTriggerPosition({
          top: coords.top - containerRect.top + topOffset,
          left: coords.left - containerRect.left,
        });
      }
    } else {
      setVariableTriggerPosition(null);
    }
  }, [selectedVariable]);

  useEffect(() => {
    // Calculate translation popover position when translation is selected
    if (enableTranslations && selectedTranslation && viewRef.current) {
      const coords = viewRef.current.coordsAtPos(selectedTranslation.from);

      if (coords) {
        const topOffset = TRANSLATION_PILL_HEIGHT + 4; // Small offset below the pill
        setTranslationTriggerPosition({
          top: coords.top + topOffset,
          left: coords.left,
        });
      }
    } else {
      setTranslationTriggerPosition(null);
    }
  }, [selectedTranslation, enableTranslations]);

  return (
    <div ref={containerRef} className={className} onClick={handleContainerClick}>
      <Editor
        fontFamily={fontFamily}
        multiline={multiline}
        indentWithTab={indentWithTab}
        size={size}
        className={cn('flex-1')}
        autoFocus={autoFocus}
        placeholder={placeholder}
        id={id}
        extensions={editorExtensions}
        lineNumbers={lineNumbers}
        foldGutter={foldGutter}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        tagStyles={tagStyles}
      />
      {isVariablePopoverOpen && (
        <EditVariablePopover
          isPayloadSchemaEnabled={isPayloadSchemaEnabled}
          variables={variables}
          open={isVariablePopoverOpen}
          onOpenChange={handleVariablePopoverOpenChange}
          variable={variable}
          isAllowedVariable={enhancedIsAllowedVariable}
          onUpdate={(newValue) => {
            handleVariableUpdate(newValue);
            // Focus back to the editor after updating the variable
            setTimeout(() => viewRef.current?.focus(), 0);
          }}
          onDeleteClick={() => {
            handleVariableUpdate('');
            setSelectedVariable(null);
            // Focus back to the editor after updating the variable
            setTimeout(() => viewRef.current?.focus(), 0);
          }}
          getSchemaPropertyByKey={getSchemaPropertyByKey}
          onManageSchemaClick={(variableName) => {
            openSchemaDrawer(variableName);
          }}
          onAddToSchemaClick={(variableName) => {
            handleCreateNewVariable(variableName);
          }}
        >
          <div
            className="pointer-events-none absolute z-10"
            style={
              variableTriggerPosition
                ? {
                    top: variableTriggerPosition.top,
                    left: variableTriggerPosition.left,
                    width: '1px',
                    height: '1px',
                  }
                : undefined
            }
          />
        </EditVariablePopover>
      )}
      {isTranslationPopoverOpen && selectedTranslation && workflow?._id && enableTranslations && (
        <EditTranslationPopover
          open={isTranslationPopoverOpen}
          onOpenChange={handleTranslationPopoverOpenChange}
          translationKey={selectedTranslation.translationKey}
          onDelete={handleTranslationDelete}
          onReplaceKey={handleTranslationReplaceKey}
          variables={variables}
          isAllowedVariable={enhancedIsAllowedVariable}
          workflowId={workflow._id}
          position={translationTriggerPosition || undefined}
        />
      )}

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
}
