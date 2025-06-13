import { useCallback, useMemo } from 'react';
import { Completion, CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';
import { liquid, liquidCompletionSource } from '@codemirror/lang-liquid';
import { html, htmlCompletionSource } from '@codemirror/lang-html';
import { tags as t } from '@lezer/highlight';

import { VariableEditor } from '@/components/primitives/variable-editor';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { cn } from '@/utils/ui';
import { CompletionOption } from '@/utils/liquid-autocomplete';

type HtmlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const gutterElementClassName =
  '[&_.cm-gutterElement]:flex [&_.cm-gutterElement]:items-center [&_.cm-gutterElement]:justify-end [&_.cm-gutterElement]:text-text-soft [&_.cm-gutterElement]:font-code [&_.cm-gutterElement]:text-code-sm [&_.cm-gutterElement>span]:h-full';

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

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

  const extensions = useMemo(() => {
    return [liquid({ base: html() })];
  }, []);

  const completionSources = useMemo(() => {
    return [enhancedLiquidCompletionSource, htmlCompletionSource];
  }, [enhancedLiquidCompletionSource]);

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

  return (
    <VariableEditor
      className={cn(
        'bg-background min-h-full w-full rounded-lg px-2 py-3 [&_.cm-gutters]:mr-2',
        gutterElementClassName
      )}
      value={value}
      onChange={onChange}
      variables={variables}
      isAllowedVariable={isAllowedVariable}
      multiline
      lineNumbers
      foldGutter
      size="sm"
      fontFamily="inherit"
      extensions={extensions}
      completionSources={completionSources}
      tagStyles={tagStyles}
    />
  );
}
