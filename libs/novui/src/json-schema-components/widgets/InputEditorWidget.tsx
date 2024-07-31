import { useEffect, useMemo, useRef } from 'react';

import { WidgetProps } from '@rjsf/utils';

import { Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';

import { type Extensions, useEditor } from '@tiptap/react';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import { ReactRenderer } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Mention from '@tiptap/extension-mention';

import { css, cx } from '../../../styled-system/css';
import { input, inputEditorWidget } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';

import { VariableSuggestionList, SuggestionListRef, VariableItem } from './VariableSuggestionList';

const inputEditorClassNames = inputEditorWidget();

const AUTOCOMPLETE_OPEN_TAG = '{{';
const AUTOCOMPLETE_CLOSE_TAG = '}}';

const AUTOCOMPLETE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}(.*?(.*?))${AUTOCOMPLETE_CLOSE_TAG}`, 'gm');

export const InputEditorWidget = (props: WidgetProps) => {
  const { value, label, formContext, onChange, required, readonly, rawErrors, options, schema } = props;
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
      Mention.configure({
        HTMLAttributes: {
          class: 'suggestion',
        },
        renderHTML: ({ options, node }) => {
          return [
            'span',
            options.HTMLAttributes,
            `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`,
          ];
        },
        renderText: ({ options, node }) => {
          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;
        },
        suggestion: {
          items: ({ query }) => {
            return variablesList?.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
          },
          char: AUTOCOMPLETE_OPEN_TAG,
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
    onUpdate: ({ editor }) => {
      const content = editor.isEmpty ? undefined : editor.getText();
      onChange(content);
    },
  });

  useEffect(() => {
    if (editor) {
      const newValue = value
        ?.toString()
        .replace(
          AUTOCOMPLETE_REGEX,
          '<span data-id="$1" contenteditable="false" class="suggestion" data-type="mention">$1</span>'
        );

      editor.commands.setContent(newValue);
    }
  }, []);

  return (
    <Input.Wrapper
      classNames={classNames}
      className={cx('group', css(cssProps))}
      required={required}
      label={label}
      description={props.schema.description}
      error={rawErrors?.length > 0 && rawErrors}
    >
      <RichTextEditor classNames={inputEditorClassNames} editor={editor}>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Input.Wrapper>
  );
};
