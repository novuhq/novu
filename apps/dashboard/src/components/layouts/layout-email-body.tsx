import { Variable } from '@maily-to/core/extensions';
import { Editor } from '@tiptap/core';
import { EditorView } from '@uiw/react-codemirror';
import React, { useCallback, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { HtmlEditor } from '@/components/html-editor';
import { Maily } from '@/components/maily/maily';
import { isMailyJson } from '@/components/maily/maily-utils';
import { FormField } from '@/components/primitives/form/form';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { useTelemetry } from '@/hooks/use-telemetry';
import { createEditorBlocks } from '../maily/maily-config';
import { VariableFrom } from '../maily/types';
import { MailyVariablesListView, VariableSuggestionsPopoverRef } from '../maily/views/maily-variables-list-view';
import { BubbleMenuVariablePill, createVariableNodeView } from '../maily/views/variable-view';
import { CompletionRange } from '../primitives/variable-editor';
import { useLayoutEditor } from './layout-editor-provider';

const MailyVariablesListViewForLayouts = React.forwardRef<
  VariableSuggestionsPopoverRef,
  {
    items: Variable[];
    onSelectItem: (item: Variable) => void;
  }
>((props, ref) => {
  return <MailyVariablesListView {...props} ref={ref} />;
});

export const LayoutEmailBody = () => {
  const viewRef = useRef<EditorView | null>(null);
  const lastCompletionRef = useRef<CompletionRange | null>(null);
  const { layout } = useLayoutEditor();
  const { control } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });
  const parsedVariables = useParseVariables(layout?.variables);

  const track = useTelemetry();

  const blocks = useMemo(() => {
    return createEditorBlocks({ track });
  }, [track]);

  const editorKey = useMemo(() => {
    const variableNames = [...parsedVariables.primitives, ...parsedVariables.arrays, ...parsedVariables.namespaces]
      .map((v: any) => v.name)
      .sort()
      .join(',');

    return `vars-${variableNames.length}-${variableNames.slice(0, 100)}`;
  }, [parsedVariables.primitives, parsedVariables.arrays, parsedVariables.namespaces]);

  const renderVariable = useCallback(
    (opts: {
      variable: Variable;
      fallback?: string;
      editor: Editor;
      from: 'content-variable' | 'bubble-variable' | 'button-variable';
    }) => {
      return (
        <BubbleMenuVariablePill
          isPayloadSchemaEnabled={false}
          variableName={opts.variable.name}
          className="h-5 text-xs"
          editor={opts.editor}
          from={opts.from as VariableFrom}
          variables={parsedVariables.variables}
          isAllowedVariable={parsedVariables.isAllowedVariable}
        />
      );
    },
    [parsedVariables]
  );

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        // when switching to html/block editor, we still might have locally maily json or html content
        // so we need will show the empty string until we receive the updated value from the server
        const isMaily = isMailyJson(field.value);

        if (editorType === 'html') {
          return (
            <HtmlEditor
              viewRef={viewRef}
              lastCompletionRef={lastCompletionRef}
              value={isMaily ? '' : field.value}
              variables={parsedVariables.variables}
              isAllowedVariable={parsedVariables.isAllowedVariable}
              onChange={field.onChange}
              isPayloadSchemaEnabled={false}
              className="max-h-[calc(100%-45px)]"
            />
          );
        }

        return (
          <Maily
            key={editorKey}
            value={isMaily ? field.value : ''}
            onChange={field.onChange}
            variables={parsedVariables}
            blocks={blocks}
            addDigestVariables={false}
            isPayloadSchemaEnabled={false}
            isTranslationEnabled={false}
            translationKeys={[]}
            variableSuggestionsPopover={MailyVariablesListViewForLayouts}
            renderVariable={renderVariable}
            createVariableNodeView={createVariableNodeView}
          />
        );
      }}
    />
  );
};
