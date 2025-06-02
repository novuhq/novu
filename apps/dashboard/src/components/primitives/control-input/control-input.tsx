import { cn } from '@/utils/ui';
import { autocompletion } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { cva } from 'class-variance-authority';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

import { Editor } from '@/components/primitives/editor';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { CompletionOption, createAutocompleteSource } from '@/utils/liquid-autocomplete';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useVariables } from './hooks/use-variables';
import { createVariableExtension } from './variable-plugin';
import { variablePillTheme } from './variable-plugin/variable-theme';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DIGEST_VARIABLES_FILTER_MAP } from '@/components/variable/utils/digest-variables';
import { useWorkflowSchema } from '@/components/workflow-editor/workflow-schema-provider';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { useCreateVariable } from '../../variable/hooks/use-create-variable';
import { DEFAULT_SIDE_OFFSET } from '../popover';
import { DEFAULT_VARIABLE_PILL_HEIGHT } from './variable-plugin/variable-pill-widget';

const variants = cva('relative w-full', {
  variants: {
    size: {
      md: 'p-2.5',
      sm: 'p-2',
      '2xs': 'px-2 py-1.5',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type CompletionRange = {
  from: number;
  to: number;
};

type ControlInputProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'sm' | '2xs';
  id?: string;
  multiline?: boolean;
  indentWithTab?: boolean;
};

export function ControlInput({
  value,
  onChange,
  variables,
  className,
  placeholder,
  autoFocus,
  id,
  multiline = false,
  size = 'sm',
  indentWithTab,
  isAllowedVariable,
}: ControlInputProps) {
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

  const completionSource = useMemo(() => {
    return createAutocompleteSource(variables, onVariableSelect, handleCreateNewVariable, isPayloadSchemaEnabled);
  }, [variables, onVariableSelect, handleCreateNewVariable, isPayloadSchemaEnabled]);

  const autocompletionExtension = useMemo(
    () =>
      autocompletion({
        override: completionSource ? [completionSource] : ([] as any[]),
        closeOnBlur: true,
        defaultKeymap: true,
        activateOnTyping: true,
        optionClass: (completion) => (completion.type === 'new-variable' ? 'cm-new-variable-option' : ''),
      }),
    [completionSource]
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
    });
  }, [handleVariableSelect, enhancedIsAllowedVariable, isDigestEventsVariable]);

  const extensions = useMemo(() => {
    const baseExtensions = [...(multiline ? [EditorView.lineWrapping] : []), variablePillTheme];
    return [...baseExtensions, autocompletionExtension, variablePluginExtension];
  }, [autocompletionExtension, variablePluginExtension, multiline]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setTimeout(() => setSelectedVariable(null), 0);
        viewRef.current?.focus();
      }
    },
    [setSelectedVariable]
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
    <div ref={containerRef} className={cn(variants({ size }), className)}>
      <Editor
        key={schemaKey}
        fontFamily="inherit"
        multiline={multiline}
        indentWithTab={indentWithTab}
        size={size}
        className={cn('flex-1')}
        autoFocus={autoFocus}
        placeholder={placeholder}
        id={id}
        extensions={extensions}
        value={value}
        onChange={onChange}
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
