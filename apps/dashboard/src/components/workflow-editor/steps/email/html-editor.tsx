import { liquid, liquidCompletionSource } from '@codemirror/lang-liquid';
import { html, htmlCompletionSource } from '@codemirror/lang-html';
import { tags as t } from '@lezer/highlight';

import { VariableEditor } from '@/components/primitives/variable-editor';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { cn } from '@/utils/ui';

type HtmlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const gutterElementClassName =
  '[&_.cm-gutterElement]:flex [&_.cm-gutterElement]:items-center [&_.cm-gutterElement]:justify-end [&_.cm-gutterElement]:text-text-soft [&_.cm-gutterElement]:font-code [&_.cm-gutterElement]:text-code-sm [&_.cm-gutterElement>span]:h-full';

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

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
      extensions={[liquid({ base: html() })]}
      completionSources={[liquidCompletionSource(), htmlCompletionSource]}
      tagStyles={[
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
      ]}
    />
  );
}
