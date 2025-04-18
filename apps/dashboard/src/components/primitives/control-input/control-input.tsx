import { cn } from '@/utils/ui';
import { autocompletion } from '@codemirror/autocomplete';
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
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const variants = cva('relative w-full', {
  variants: {
    size: {
      md: 'p-2.5',
      sm: 'p-2.5',
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
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);
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

  const completionSource = useMemo(
    () => createAutocompleteSource(variables, isEnhancedDigestEnabled),
    [variables, isEnhancedDigestEnabled]
  );

  const autocompletionExtension = useMemo(
    () =>
      autocompletion({
        override: [completionSource],
        closeOnBlur: true,
        defaultKeymap: true,
        activateOnTyping: true,
      }),
    [completionSource]
  );

  const variablePluginExtension = useMemo(
    () =>
      createVariableExtension({
        viewRef,
        lastCompletionRef,
        onSelect: handleVariableSelect,
        isAllowedVariable,
        isEnhancedDigestEnabled,
      }),
    [handleVariableSelect, isAllowedVariable, isEnhancedDigestEnabled]
  );

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
