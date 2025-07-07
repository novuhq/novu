import { cn } from '@/utils/ui';
import { autocompletion, CompletionSource } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useMemo, useRef, useState, useEffect, MutableRefObject } from 'react';
import { JSONSchema7 } from 'json-schema';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { Editor, EditorProps } from '@/components/primitives/editor';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { CompletionOption, createAutocompleteSource } from '@/utils/liquid-autocomplete';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useVariables } from '../../hooks/use-variables';
import { createVariableExtension } from '@/components/primitives/variable-plugin';
import { variablePillTheme } from '@/components/primitives/variable-plugin/variable-theme';
import { DEFAULT_VARIABLE_PILL_HEIGHT } from '@/components/primitives/variable-plugin/variable-pill-widget';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DIGEST_VARIABLES_FILTER_MAP } from '@/components/variable/utils/digest-variables';
import { DEFAULT_SIDE_OFFSET } from './popover';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export type CompletionRange = {
  from: number;
  to: number;
};

type VariableEditorProps = {
  viewRef: MutableRefObject<EditorView | null>;
  lastCompletionRef: MutableRefObject<CompletionRange | null>;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  autoFocus?: boolean;
  id?: string;
  indentWithTab?: boolean;
  completionSources?: CompletionSource[];
  isPayloadSchemaEnabled?: boolean;
  digestStepName?: string;
  getSchemaPropertyByKey?: (key: string) => JSONSchema7 | undefined;
  onCreateNewVariable?: (variableName: string) => Promise<void>;
  onManageSchemaClick?: (variableName: string) => void;
  skipContainerClick?: boolean;
  children?: React.ReactNode;
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

/**
 * The VariableEditor is a wrapper around the Editor component that adds variable pill support.
 * Note: Please keep it pure and don't add any module specific logic to it, for example workflows related logic.
 */
export function VariableEditor({
  viewRef,
  lastCompletionRef,
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
  isPayloadSchemaEnabled = false,
  digestStepName,
  skipContainerClick = false,
  getSchemaPropertyByKey = () => undefined,
  onCreateNewVariable = () => Promise.resolve(),
  onManageSchemaClick = () => {},
  children,
}: VariableEditorProps) {
  const isCustomHtmlEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED);
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
  const track = useTelemetry();

  const [variableTriggerPosition, setVariableTriggerPosition] = useState<{ top: number; left: number } | null>(null);

  const onVariableSelect = useCallback(
    (completion: CompletionOption) => {
      if (completion.isNewVariable && completion.label.startsWith('payload.')) {
        onCreateNewVariable(completion.label.replace('payload.', ''));
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
    [track, onCreateNewVariable]
  );

  const variableCompletionSource = useMemo(() => {
    return createAutocompleteSource(variables, onVariableSelect, onCreateNewVariable, isPayloadSchemaEnabled);
  }, [variables, onVariableSelect, onCreateNewVariable, isPayloadSchemaEnabled]);

  const autocompletionExtension = useMemo(() => {
    const sources = [variableCompletionSource];

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
  }, [variableCompletionSource, completionSources]);

  const isDigestEventsVariable = useCallback(
    (variableName: string) => {
      const { value } = getDynamicDigestVariable({
        type: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
        digestStepName,
      });

      if (!value) return false;

      const valueWithoutFilters = value.split('|')[0].trim();
      return variableName === valueWithoutFilters;
    },
    [digestStepName]
  );

  const variablePluginExtension = useMemo(() => {
    return createVariableExtension({
      viewRef,
      lastCompletionRef,
      onSelect: handleVariableSelect,
      isAllowedVariable,
      isDigestEventsVariable,
      isCustomHtmlEditorEnabled,
    });
  }, [
    viewRef,
    lastCompletionRef,
    isCustomHtmlEditorEnabled,
    handleVariableSelect,
    isAllowedVariable,
    isDigestEventsVariable,
  ]);

  const editorExtensions = useMemo(() => {
    const baseExtensions = [...(multiline ? [EditorView.lineWrapping] : []), variablePillTheme];
    const allExtensions = [...baseExtensions, autocompletionExtension, variablePluginExtension];

    if (extensions) {
      allExtensions.push(...extensions);
    }

    return allExtensions;
  }, [autocompletionExtension, variablePluginExtension, multiline, extensions]);

  const handleVariablePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setTimeout(() => setSelectedVariable(null), 0);
        viewRef.current?.focus();
      }
    },
    [setSelectedVariable, viewRef]
  );

  /**
   * This is a workaround to focus the editor when clicking on the container.
   * It's a known issue with Codemirror in case of the container is bigger in size than a single focusable row.
   */
  const handleContainerClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // Don't focus if a variable popover is open or if clicking on interactive elements
      if (isVariablePopoverOpen || skipContainerClick) return;

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
    [isVariablePopoverOpen, skipContainerClick, viewRef]
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
  }, [selectedVariable, viewRef, containerRef]);

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
          isAllowedVariable={isAllowedVariable}
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
          onManageSchemaClick={onManageSchemaClick}
          onAddToSchemaClick={(variableName) => {
            onCreateNewVariable(variableName);
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
      {children}
    </div>
  );
}
