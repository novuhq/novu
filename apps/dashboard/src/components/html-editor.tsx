import { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { html, htmlCompletionSource } from '@codemirror/lang-html';
import { liquid, liquidCompletionSource } from '@codemirror/lang-liquid';
import { tags as t } from '@lezer/highlight';
import { EditorView, Extension } from '@uiw/react-codemirror';
import { JSONSchema7 } from 'json-schema';
import { MutableRefObject, useCallback, useMemo, useRef } from 'react';
import { RiCodeSSlashFill } from 'react-icons/ri';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { CompletionRange, VariableEditor } from '@/components/primitives/variable-editor';
import { formatHtml } from '@/utils/formatter';
import { CompletionOption } from '@/utils/liquid-autocomplete';
import { LiquidVariable } from '@/utils/parseStepVariables';
import { cn } from '@/utils/ui';

type HtmlEditorProps = {
  viewRef: MutableRefObject<EditorView | null>;
  lastCompletionRef: MutableRefObject<CompletionRange | null>;
  value: string;
  variables: LiquidVariable[];
  isAllowedVariable: (variable: LiquidVariable) => boolean;
  onChange: (value: string) => void;
  saveForm?: () => void;
  completionSources?: CompletionSource[];
  extensions?: Extension[];
  children?: React.ReactNode;
  isPayloadSchemaEnabled?: boolean;
  isTranslationEnabled?: boolean;
  className?: string;
  digestStepName?: string;
  getSchemaPropertyByKey?: (key: string) => JSONSchema7 | undefined;
  onCreateNewVariable?: (variableName: string) => Promise<void>;
  onManageSchemaClick?: (variableName: string) => void;
  skipContainerClick?: boolean;
};

const gutterElementClassName =
  '[&_.cm-gutterElement]:flex [&_.cm-gutterElement]:items-center [&_.cm-gutterElement]:justify-end [&_.cm-gutterElement]:text-text-soft [&_.cm-gutterElement]:font-code [&_.cm-gutterElement]:text-code-xs [&_.cm-gutterElement>span]:h-full';

/**
 * The HtmlEditor component is a wrapper around the VariableEditor and adds the formatting, html and liquid syntax highlighting.
 * Note: Please keep it pure and don't add any additional logic to it, for example workflows related logic.
 */
export function HtmlEditor({
  viewRef,
  lastCompletionRef,
  value,
  variables,
  completionSources = [],
  children,
  extensions,
  isAllowedVariable,
  onChange,
  saveForm,
  isPayloadSchemaEnabled = false,
  isTranslationEnabled = false,
  digestStepName,
  skipContainerClick = false,
  className,
  getSchemaPropertyByKey = () => undefined,
  onCreateNewVariable = () => Promise.resolve(),
  onManageSchemaClick = () => {},
}: HtmlEditorProps) {
  const formatButtonRef = useRef<HTMLButtonElement>(null);

  const enhancedLiquidCompletionSource = useCallback((context: CompletionContext) => {
    const result = liquidCompletionSource()(context);
    if (!result) return null;

    return {
      ...result,
      options: result?.options.map(
        (option) =>
          ({
            ...option,
            apply: (view: EditorView, completion: CompletionOption, from: number, to: number) => {
              // Only apply to property completions, for example {{ forloop.first }}, where first is a property of forloop
              if (completion.type !== 'property') {
                return;
              }

              const selectedValue = completion.label;

              const content = view.state.doc.toString();
              const afterCursor = content.slice(to);

              // Ensure proper {{ }} wrapping
              const needsClosing = !afterCursor.startsWith('}}');

              const wrappedValue = `${selectedValue}${needsClosing ? '}}' : ''}`;

              // Calculate the final cursor position
              // Add 2 if we need to account for closing brackets
              const finalCursorPos = from + wrappedValue.length + (needsClosing ? 0 : 2);

              view.dispatch({
                changes: { from, to, insert: wrappedValue },
                selection: { anchor: finalCursorPos },
              });

              return true;
            },
          }) as Completion
      ),
    };
  }, []);

  const allExtensions = useMemo(() => {
    return [liquid({ base: html() }), ...(extensions || [])];
  }, [extensions]);

  const allCompletionSources = useMemo(() => {
    return [enhancedLiquidCompletionSource, htmlCompletionSource, ...completionSources];
  }, [completionSources, enhancedLiquidCompletionSource]);

  const tagStyles = useMemo(() => {
    return [
      // HTML tag styles
      { tag: t.tagName, color: 'hsl(var(--feature))' },
      { tag: t.angleBracket, color: 'hsl(var(--neutral-600))' },
      { tag: t.attributeName, color: 'hsl(var(--highlighted))' },
      { tag: t.attributeValue, color: 'hsl(var(--information))' },
      { tag: t.comment, color: 'hsl(var(--neutral-500))', fontStyle: 'italic' },
      // additional HTML-specific styles
      { tag: t.processingInstruction, color: 'hsl(var(--neutral-600))' },
      { tag: t.meta, color: 'hsl(var(--information))' },
      // CSS styles
      { tag: t.className, color: 'hsl(var(--feature))' },
      { tag: t.propertyName, color: 'hsl(var(--highlighted))' },
      { tag: t.unit, color: 'hsl(var(--warning))' },
      { tag: t.number, color: 'hsl(var(--warning))' },
      { tag: t.operator, color: 'hsl(var(--warning))' },
      { tag: t.punctuation, color: 'hsl(var(--neutral-600))' },
      { tag: t.bracket, color: 'hsl(var(--neutral-700))' },
      { tag: t.url, color: 'hsl(var(--warning))', textDecoration: 'underline' },
      { tag: t.variableName, color: 'hsl(var(--warning))' },
      // additional valid CSS-related styles
      { tag: t.literal, color: 'hsl(var(--warning))' },
      { tag: t.string, color: 'hsl(var(--warning))' },
      { tag: t.keyword, color: 'hsl(var(--information))' },
      { tag: t.atom, color: 'hsl(var(--warning))' },
    ];
  }, []);

  const handleFormatClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      try {
        const formattedValue = await formatHtml(value);
        onChange(formattedValue);
        saveForm?.();
      } catch (error) {
        showErrorToast(
          <>
            <p className="font-semibold">Failed to format code:</p>
            <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </>
        );
      }
    },
    [value, onChange, saveForm]
  );

  const handleEditorBlur = useCallback((e: React.FocusEvent<HTMLDivElement, Element>) => {
    // if the blur happens on the format button, we don't want to trigger blur on the editor
    // because it will save the form unformatted and than format it again
    if (e.relatedTarget === formatButtonRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
  }, []);

  return (
    <div className={cn('relative h-full flex-1 border-t border-neutral-200', className)}>
      <Tooltip>
        <TooltipTrigger
          ref={formatButtonRef}
          onClick={handleFormatClick}
          className="absolute right-2 top-2 z-10"
          onBlur={(e) => {
            // don't trigger blur as it will result is save form unnecessary request
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <RiCodeSSlashFill className="size-3.5 fill-neutral-500" />
        </TooltipTrigger>
        <TooltipContent side="right">Format code</TooltipContent>
      </Tooltip>

      <VariableEditor
        viewRef={viewRef}
        lastCompletionRef={lastCompletionRef}
        className={cn(
          'bg-background h-full w-full overflow-y-auto rounded-lg px-2 py-3 [&_.cm-gutters]:mr-2 [&_.cm-scroller]:overflow-auto',
          gutterElementClassName
        )}
        value={value}
        onChange={onChange}
        onBlur={handleEditorBlur}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        multiline
        lineNumbers
        foldGutter
        size="sm"
        fontFamily="inherit"
        tagStyles={tagStyles}
        completionSources={allCompletionSources}
        isPayloadSchemaEnabled={isPayloadSchemaEnabled}
        isTranslationEnabled={isTranslationEnabled}
        getSchemaPropertyByKey={getSchemaPropertyByKey}
        extensions={allExtensions}
        digestStepName={digestStepName}
        skipContainerClick={skipContainerClick}
        onManageSchemaClick={onManageSchemaClick}
        onCreateNewVariable={onCreateNewVariable}
      >
        {children}
      </VariableEditor>
    </div>
  );
}
