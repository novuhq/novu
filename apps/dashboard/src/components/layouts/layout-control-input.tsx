import { EditorView } from '@uiw/react-codemirror';
import { cva } from 'class-variance-authority';
import { useMemo, useRef } from 'react';
import { CompletionRange, VariableEditor } from '@/components/primitives/variable-editor';
import { useEditorTranslationOverlay } from '@/hooks/use-editor-translation-overlay';
import { LocalizationResourceEnum } from '@/types/translations';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { cn } from '@/utils/ui';
import { EditTranslationPopover } from '../workflow-editor/steps/email/translations/edit-translation-popover/edit-translation-popover';
import { useLayoutEditor } from './layout-editor-provider';

const variants = cva('relative w-full', {
  variants: {
    size: {
      md: 'p-2.5',
      sm: 'p-2',
      '2xs': 'px-2 py-1.5',
      '3xs': 'px-1.5 py-1 text-xs',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type LayoutControlInputProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'sm' | '2xs' | '3xs';
  id?: string;
  multiline?: boolean;
  indentWithTab?: boolean;
  enableTranslations?: boolean;
  disabled?: boolean;
};

export function LayoutControlInput({
  value,
  onChange,
  onBlur,
  variables,
  className,
  placeholder,
  autoFocus,
  id,
  multiline = false,
  size = 'sm',
  indentWithTab,
  isAllowedVariable,
  enableTranslations = false,
  disabled = false,
}: LayoutControlInputProps) {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { layout } = useLayoutEditor();
  const resourceId = layout?.layoutId || '';
  const resourceType = LocalizationResourceEnum.LAYOUT;

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
    enableTranslations,
    isTranslationEnabledOnResource: !!layout?.isTranslationEnabled,
  });

  const extensions = useMemo(() => {
    if (!translationPluginExtension) return [];

    return [translationPluginExtension];
  }, [translationPluginExtension]);

  return (
    <VariableEditor
      viewRef={viewRef}
      lastCompletionRef={lastCompletionRef}
      className={cn(variants({ size }), className)}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      variables={variables}
      isAllowedVariable={isAllowedVariable}
      placeholder={placeholder}
      autoFocus={autoFocus}
      id={id}
      multiline={multiline}
      indentWithTab={indentWithTab}
      size={size}
      completionSources={translationCompletionSource}
      isPayloadSchemaEnabled={false}
      isTranslationEnabled={shouldEnableTranslations}
      extensions={extensions}
      skipContainerClick={isTranslationPopoverOpen}
      disabled={disabled}
    >
      {isTranslationPopoverOpen && selectedTranslation && resourceId && enableTranslations && (
        <EditTranslationPopover
          open={isTranslationPopoverOpen}
          onOpenChange={handleTranslationPopoverOpenChange}
          translationKey={selectedTranslation.translationKey}
          onDelete={handleTranslationDelete}
          onReplaceKey={handleTranslationReplaceKey}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          resourceId={resourceId}
          resourceType={resourceType}
          position={translationTriggerPosition || undefined}
          translationValueInput={LayoutControlInput}
        />
      )}
    </VariableEditor>
  );
}
