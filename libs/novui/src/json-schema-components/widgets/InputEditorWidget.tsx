import { useEffect, useMemo, useRef } from 'react';

import { ErrorSchema, WidgetProps } from '@rjsf/utils';

import { Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';

import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ReactRenderer, useEditor, type Extensions } from '@tiptap/react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { input, inputEditorWidget } from '../../../styled-system/recipes';
import {
  AUTOCOMPLETE_OPEN_TAG,
  INVALID_VARIABLE_REGEX,
  VALID_VARIABLE_REGEX,
  VariableErrorCode,
  VARIABLE_ERROR_MESSAGES,
} from '../constants';
import { InputAutocompleteContextProvider } from '../context';
import { cleanVariableMatch, extractErrorCodesFromHtmlContent } from '../utils';
import { CustomMention } from './customMentionExtension';
import { SuggestionListRef, VariableItem, VariableSuggestionList } from './VariableSuggestionList';

const inputEditorClassNames = inputEditorWidget();

const getInitContentWithVariableNodeView = (inputString: string, variablesSet: Set<string>) => {
  if (!inputString) {
    return inputString;
  }

  let result = inputString.toString().replace(VALID_VARIABLE_REGEX, (match, validContent) => {
    const cleanedMatch = cleanVariableMatch(match);
    const isValidVariable = variablesSet.has(cleanedMatch);

    return `<mention-component data-label="${validContent}" data-id="${validContent}" ${
      !isValidVariable ? `data-error="${VariableErrorCode.INVALID_NAME}"` : ''
    }></mention-component>`;
  });

  result = result?.replace(INVALID_VARIABLE_REGEX, (match) => {
    return `<mention-component data-label="${match}" data-id="${match}" data-error="${VariableErrorCode.INVALID_SYNTAX}"></mention-component>`;
  });

  return result;
};

export const InputEditorWidget = (props: WidgetProps) => {
  const { value, label, formContext, onChange, required, readonly, rawErrors } = props;

  const [variantProps, inputProps] = input.splitVariantProps({});
  const [cssProps] = splitCssProps(inputProps);
  const classNames = input(variantProps);

  const { variables = [] } = formContext;
  const reactRenderer = useRef<ReactRenderer<SuggestionListRef>>(null);

  const [variablesList, variablesSet] = useMemo<[VariableItem[], Set<string>]>(() => {
    const variableDisplayList = variables?.map((variable: string) => {
      return { label: variable, id: variable };
    });

    return [variableDisplayList, new Set(variables)];
  }, [variables]);

  const baseExtensions: Extensions = [Document, Paragraph, Text];

  if (variables.length) {
    baseExtensions.push(
      CustomMention(variables).configure({
        suggestion: {
          items: ({ query }) => {
            return variablesList?.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
          },
          char: AUTOCOMPLETE_OPEN_TAG,
          decorationClass: 'suggestion',
          allowSpaces: true,
          allowedPrefixes: null,
          render() {
            return {
              onStart: (props) => {
                reactRenderer.current = new ReactRenderer(VariableSuggestionList, {
                  props,
                  editor: props.editor,
                });
              },
              onUpdate(props) {
                reactRenderer.current?.updateProps(props);
              },
              onKeyDown(props) {
                if (!reactRenderer.current?.ref) {
                  return false;
                }

                return reactRenderer.current?.ref.onKeyDown(props);
              },
              onExit() {
                reactRenderer.current?.destroy();
              },
            };
          },
        },
      })
    );
  }

  const editor = useEditor({
    extensions: baseExtensions,
    content: '',
    editable: !readonly,
    onFocus: () => {
      reactRenderer.current?.ref?.focus();
    },
    onBlur: () => {
      reactRenderer.current?.ref?.blur();
    },
    onUpdate: ({ editor }) => {
      const content = editor.isEmpty ? undefined : editor.getText();
      const htmlContent = editor.isEmpty ? undefined : editor.getHTML();

      // extract error messages from HTML and convert to user-friendly messages
      const parsedErrorCodes = extractErrorCodesFromHtmlContent(htmlContent);

      let errorMessages: string[];
      if (parsedErrorCodes && parsedErrorCodes.length > 0) {
        errorMessages = [...new Set(parsedErrorCodes).values()].map((code) => VARIABLE_ERROR_MESSAGES[code]);
      }

      onChange(content, { __errors: errorMessages } as ErrorSchema);
    },
  });

  useEffect(() => {
    if (editor) {
      const output = getInitContentWithVariableNodeView(value?.toString(), variablesSet);

      // Set timeout is for a known tiptap error with setting content on initial render https://github.com/ueberdosis/tiptap/issues/3764
      const timeoutId = setTimeout(() => {
        editor.commands.setContent(output);
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
