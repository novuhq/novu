import { cn } from '@/utils/ui';
import { autocompletion, CompletionSource } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { Editor, EditorProps } from '@/components/primitives/editor';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { CompletionOption, createAutocompleteSource } from '@/utils/liquid-autocomplete';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useVariables } from './control-input/hooks/use-variables';
import { createVariableExtension } from './control-input/variable-plugin';
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
} & Pick<
  EditorProps,
  | 'className'
  | 'placeholder'
  | 'value'
  | 'onChange'
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
}: VariableEditorProps) {
  const isCustomHtmlEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED);
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedVariable, setSelectedVariable, handleVariableSelect, handleVariableUpdate } = useVariables(
    viewRef,
    onChange
  );
  const isVariablePopoverOpen = !!selectedVariable;
  const variable: LiquidVariable | undefined = selectedVariable
    ? {
        name: selectedVariable.value,
      }
    : undefined;

  const { digestStepBeforeCurrent, workflow } = useWorkflow();
  const track = useTelemetry();

  const { getSchemaPropertyByKey, isPayloadSchemaEnabled, currentSchema } = useWorkflowSchema();

  const {
    handleCreateNewVariable,
    isPayloadSchemaDrawerOpen,
    highlightedVariableKey,
    openSchemaDrawer,
    closeSchemaDrawer,
  } = useCreateVariable();

  const [triggerPosition, setTriggerPosition] = useState<{ top: number; left: number } | null>(null);

  // Create a stable key based on schema properties to force editor re-render
  const schemaKey = useMemo(() => {
    if (!currentSchema?.properties) return 'no-schema';

    return `schema-${Object.keys(currentSchema.properties).sort().join('-')}`;
  }, [currentSchema]);

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

  const autocompletionExtension = useMemo(
    () =>
      autocompletion({
        override: [variableCompletionSource, ...(completionSources ?? [])],
        closeOnBlur: true,
        defaultKeymap: true,
        activateOnTyping: true,
        optionClass: (completion) => (completion.type === 'new-variable' ? 'cm-new-variable-option' : ''),
      }),
    [variableCompletionSource, completionSources]
  );

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

  const editorExtensions = useMemo(() => {
    const baseExtensions = [...(multiline ? [EditorView.lineWrapping] : []), variablePillTheme];
    return [...baseExtensions, autocompletionExtension, variablePluginExtension, ...(extensions ?? [])];
  }, [autocompletionExtension, variablePluginExtension, multiline, extensions]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setTimeout(() => setSelectedVariable(null), 0);
        viewRef.current?.focus();
      }
    },
    [setSelectedVariable]
  );

  /**
   * This is a workaround to focus the editor when clicking on the container.
   * It's a known issue with Codemirror in case of the container is bigger in size than a single focusable row.
   */
  const handleContainerClick = useCallback(
    (event: React.MouseEvent) => {
      // Don't focus if a variable popover is open or if clicking on interactive elements
      if (isVariablePopoverOpen) return;

      const target = event.target as HTMLElement;

      // Don't focus if clicking on variable pills or other interactive elements
      if (target.closest('.cm-variable-pill') || target.closest('[role="button"]') || target.closest('button')) {
        return;
      }

      if (viewRef.current) {
        viewRef.current.focus();
      }
    },
    [isVariablePopoverOpen]
  );

  useEffect(() => {
    // calculate popover trigger position when variable is selected
    if (selectedVariable && viewRef.current && containerRef.current) {
      const coords = viewRef.current.coordsAtPos(selectedVariable.from);
      const containerRect = containerRef.current.getBoundingClientRect();

      const topOffset = DEFAULT_VARIABLE_PILL_HEIGHT - DEFAULT_SIDE_OFFSET + 2;

      if (coords) {
        setTriggerPosition({
          top: coords.top - containerRect.top + topOffset,
          left: coords.left - containerRect.left,
        });
      }
    } else {
      setTriggerPosition(null);
    }
  }, [selectedVariable]);

  return (
    <div ref={containerRef} className={className} onClick={handleContainerClick}>
      <Editor
        key={schemaKey}
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
        tagStyles={tagStyles}
      />
      {isVariablePopoverOpen && (
        <EditVariablePopover
          isPayloadSchemaEnabled={isPayloadSchemaEnabled}
          variables={variables}
          open={isVariablePopoverOpen}
          onOpenChange={handleOpenChange}
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
              triggerPosition
                ? {
                    top: triggerPosition.top,
                    left: triggerPosition.left,
                    width: '1px',
                    height: '1px',
                  }
                : undefined
            }
          />
        </EditVariablePopover>
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
