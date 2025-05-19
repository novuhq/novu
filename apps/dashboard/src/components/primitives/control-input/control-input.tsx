import { cn } from '@/utils/ui';
import { autocompletion, Completion } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { cva } from 'class-variance-authority';
import { useCallback, useMemo, useRef } from 'react';

import { Editor } from '@/components/primitives/editor';
import { EditVariablePopover } from '@/components/variable/edit-variable-popover';
import { createAutocompleteSource } from '@/utils/liquid-autocomplete';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useVariables } from './hooks/use-variables';
import { createVariableExtension } from './variable-plugin';
import { variablePillTheme } from './variable-plugin/variable-theme';
import { DIGEST_VARIABLES_ENUM, getDynamicDigestVariable } from '@/components/variable/utils/digest-variables';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DIGEST_VARIABLES_FILTER_MAP } from '@/components/variable/utils/digest-variables';
import type { IEnvironment, WorkflowResponseDto } from '@novu/shared';
import { useEnvironment } from '../../../context/environment/hooks';
import { useWorkflowSchemaManager } from '@/components/workflow-editor/use-workflow-schema-manager';
import type { JSONSchema7TypeName } from '@/components/schema-editor/json-schema';

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
  const { currentEnvironment } = useEnvironment();
  const track = useTelemetry();

  const { addProperty: addSchemaProperty, handleSaveChanges: handleSaveSchemaChanges } = useWorkflowSchemaManager({
    workflow: workflow as WorkflowResponseDto,
    environment: currentEnvironment as IEnvironment,
    initialSchema: workflow?.payloadSchema,
  });

  const handleCreateNewVariable = useCallback(
    async (variableName: string) => {
      if (!workflow || !currentEnvironment) {
        // TODO: Handle error state - perhaps a toast notification
        console.error('Workflow or environment not available for creating new variable');

        return;
      }

      // Assuming new variables are of type string by default.
      addSchemaProperty({ keyName: variableName }, 'string' as JSONSchema7TypeName);

      try {
        await handleSaveSchemaChanges();
        // Optionally: add telemetry or success notification
      } catch (error) {
        // TODO: Handle error state - perhaps a toast notification
        console.error('Failed to save new variable to schema:', error);
      }
    },
    [workflow, currentEnvironment, addSchemaProperty, handleSaveSchemaChanges]
  );

  const onVariableSelect = useCallback(
    (completion: Completion) => {
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
    [track]
  );

  const completionSource = useMemo(() => {
    if (workflow && currentEnvironment) {
      return createAutocompleteSource(variables, onVariableSelect, handleCreateNewVariable);
    }

    return undefined;
  }, [variables, workflow, currentEnvironment, onVariableSelect, handleCreateNewVariable]);

  const autocompletionExtension = useMemo(
    () =>
      autocompletion({
        override: completionSource ? [completionSource] : [],
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
      isAllowedVariable,
      isDigestEventsVariable,
    });
  }, [handleVariableSelect, isAllowedVariable, isDigestEventsVariable]);

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

  return (
    <div className={cn(variants({ size }), className)}>
      <Editor
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
          variables={variables}
          open={isVariablePopoverOpen}
          onOpenChange={handleOpenChange}
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
        >
          <div />
        </EditVariablePopover>
      )}
    </div>
  );
}
