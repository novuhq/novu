import { useEffect, useMemo, useRef } from 'react';

import { ErrorSchema, WidgetProps } from '@rjsf/utils';

import { Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';

import { type Extensions, useEditor } from '@tiptap/react';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import { ReactRenderer } from '@tiptap/react';
import Document from '@tiptap/extension-document';

import { css, cx } from '../../../styled-system/css';
import { input, inputEditorWidget } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';

import { VariableSuggestionList, SuggestionListRef, VariableItem } from './VariableSuggestionList';
import { AUTOCOMPLETE_OPEN_TAG, INVALID_VARIABLE_REGEX, VALID_VARIABLE_REGEX } from '../utils';

import { CustomMention } from './customMentionExtention';

const inputEditorClassNames = inputEditorWidget();

const getInitContentWithVariableNodeView = (inputString: string) => {
  let result = inputString?.toString().replace(VALID_VARIABLE_REGEX, (_, validContent) => {
    return `<mention-component data-label="${validContent}" data-id="${validContent}"></mention-component>`;
  });

  result = result?.replace(INVALID_VARIABLE_REGEX, (match) => {
    return `<mention-component data-label="${match}" data-id="${match}" data-error="true"></mention-component>`;
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

  const variablesList = useMemo<VariableItem[]>(() => {
    return variables?.map((variable: string) => {
      return { label: variable, id: variable };
    });
  }, [variables]);

  const baseExtensions: Extensions = [Document, Paragraph, Text];

  if (variables.length) {
    baseExtensions.push(
      CustomMention.configure({
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

      let raiseError: ErrorSchema | undefined;
      if (editor.getHTML()?.includes('data-error="true"')) {
        raiseError = {
          __errors: ['Invalid variable syntax'],
        } as ErrorSchema;
      }

      onChange(content, raiseError);
    },
  });

  useEffect(() => {
    if (editor) {
      const output = getInitContentWithVariableNodeView(value?.toString());

      // Set timeout is for a known tiptap error with setting content on initial render https://github.com/ueberdosis/tiptap/issues/3764
      const timeoutId = setTimeout(() => {
        editor.commands.setContent(output);
      });

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, []);

  return (
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
  );
};
