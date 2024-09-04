import { useEffect, useMemo, useRef } from 'react';

import { Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { ErrorSchema, WidgetProps } from '@rjsf/utils';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import HistoryExtension from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import { Editor, ReactRenderer, useEditor, type Extensions } from '@tiptap/react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { input, inputEditorWidget } from '../../../styled-system/recipes';
import { AUTOCOMPLETE_OPEN_TAG, VARIABLE_ERROR_MESSAGES } from '../constants';
import { InputAutocompleteContextProvider } from '../context';
import {
  extractErrorCodesFromHtmlContent,
  getDeprecatedPayloadVariables,
  getInitContentWithVariableNodeView,
} from '../utils';
import { CustomMention } from './customMentionExtension';
import { SuggestionListRef, VariableItem, VariableSuggestionList } from './VariableSuggestionList';
import { SuggestionListExtension, SuggestionListStorage } from './SuggestionListExtension';

const inputEditorClassNames = inputEditorWidget();

const DEFAULT_EDITOR_EXTENSIONS: Extensions = [Document, Paragraph, Text, HistoryExtension];

export const InputEditorWidget = (props: WidgetProps) => {
  const { value, label, formContext, onChange, required, readonly, rawErrors } = props;

  const [variantProps, inputProps] = input.splitVariantProps({});
  const [cssProps] = splitCssProps(inputProps);
  const classNames = input(variantProps);

  const reactRenderer = useRef<ReactRenderer<SuggestionListRef>>(null);

  const { variables = [] } = formContext;
  const [variablesList, variablesSet] = useMemo<[VariableItem[], Set<string>]>(() => {
    const variableDisplayList = variables?.map((variable: string) => {
      return { label: variable, id: variable };
    });

    return [variableDisplayList, new Set([...variables, ...getDeprecatedPayloadVariables(variables)])];
  }, [variables]);

  const extensions = useMemo(() => {
    if (!variablesList || variablesList.length === 0) {
      return DEFAULT_EDITOR_EXTENSIONS;
    }

    return DEFAULT_EDITOR_EXTENSIONS.concat([
      SuggestionListExtension,
      CustomMention().configure({
        suggestion: {
          items: ({ editor, query }) => {
            const { suggestions } = editor.storage.SuggestionListStorage as SuggestionListStorage;

            return suggestions?.filter((item) => item.label.toLowerCase().includes(query.toLowerCase().trim()));
          },
          char: AUTOCOMPLETE_OPEN_TAG,
          decorationTag: 'span',
          decorationClass: 'suggestion',
          allowSpaces: true,
          allowedPrefixes: null,
          render() {
            return {
              onStart: (onStartProps) => {
                reactRenderer.current = new ReactRenderer(VariableSuggestionList, {
                  props: onStartProps,
                  editor: onStartProps.editor,
                });
              },
              onUpdate(onUpdateProps) {
                reactRenderer.current?.updateProps(onUpdateProps);
              },
              onKeyDown(onKeyDownProps) {
                if (!reactRenderer.current?.ref) {
                  return false;
                }

                return reactRenderer.current?.ref.onKeyDown(onKeyDownProps);
              },
              onExit() {
                reactRenderer.current?.destroy();
              },
            };
          },
        },
      }),
    ]);
  }, [variablesList]);

  const handleEditorUpdateWithValidation = ({ editor }: { editor: Editor }) => {
    const content = editor.isEmpty ? undefined : editor.getText();
    const htmlContent = editor.isEmpty ? undefined : editor.getHTML();

    // extract error messages from HTML and convert to user-friendly messages
    const parsedErrorCodes = extractErrorCodesFromHtmlContent(htmlContent);

    const errorMessages: string[] | undefined =
      parsedErrorCodes && parsedErrorCodes.size > 0
        ? [...parsedErrorCodes.values()].map((code) => VARIABLE_ERROR_MESSAGES[code])
        : undefined;

    onChange(content, { __errors: errorMessages } as ErrorSchema);
  };

  const editor = useEditor({
    extensions,
    content: '',
    editable: !readonly,
    parseOptions: {},
    onFocus: () => {
      reactRenderer.current?.ref?.focus();
    },
    onBlur: () => {
      reactRenderer.current?.ref?.blur();
    },
    onUpdate: ({ editor: editorInstance }) => {
      handleEditorUpdateWithValidation({ editor: editorInstance });
    },
  });

  // keep the suggestion list popover synced with the component state
  useEffect(() => {
    if (editor) {
      editor.storage.SuggestionListStorage.suggestions = variablesList;
    }
  }, [variablesList, editor]);

  useEffect(() => {
    if (editor) {
      const output = getInitContentWithVariableNodeView(value?.toString(), variablesSet);

      // Set timeout is for a known tiptap error with setting content on initial render https://github.com/ueberdosis/tiptap/issues/3764
      const timeoutId = setTimeout(() => {
        editor.commands.setContent(output);
        // validate on initial render
        handleEditorUpdateWithValidation({ editor });
      });

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [variablesSet]);

  return (
    <InputAutocompleteContextProvider value={{ value: { variablesSet } }}>
      <Input.Wrapper
        classNames={classNames}
        className={cx('group', css(cssProps))}
        required={required}
        label={label}
        description={props.schema.description}
        error={rawErrors?.length > 0 && rawErrors.join(', ')}
      >
        <RichTextEditor classNames={inputEditorClassNames} editor={editor} spellCheck={false}>
          <RichTextEditor.Content />
        </RichTextEditor>
      </Input.Wrapper>
    </InputAutocompleteContextProvider>
  );
};
