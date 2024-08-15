import { FocusEvent, ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { ErrorSchema, WidgetProps } from '@rjsf/utils';

import { Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';

import {
  type Extensions,
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from '@tiptap/react';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import { ReactRenderer, mergeAttributes } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import { Mention as ExternalMention } from '@tiptap/extension-mention';

import { css, cx } from '../../../styled-system/css';
import { input, inputEditorWidget } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';

import { VariableSuggestionList, SuggestionListRef, VariableItem } from './VariableSuggestionList';

const inputEditorClassNames = inputEditorWidget();

const AUTOCOMPLETE_OPEN_TAG = '{{';
const AUTOCOMPLETE_CLOSE_TAG = '}}';

const VALID_VARIABLE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}([^{}]*?)${AUTOCOMPLETE_CLOSE_TAG}`, 'g');

// To get initial invalid syntax of {{..} or {{..<space>
const INVALID_VARIABLE_REGEX = new RegExp(
  `(${AUTOCOMPLETE_OPEN_TAG}[^{}|\\s]*[}|\\s](?!})|{{[^{}]*}(?!}})|{{[^{}]*$)`,
  'g'
);
const AUTOCOMPLETE_REGEX_V2 = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}(.*?(.*?))${AUTOCOMPLETE_CLOSE_TAG}`, 'm');

const getInitContentWithVariableNodeView = (inputString: string) => {
  let result = inputString?.toString().replace(VALID_VARIABLE_REGEX, (_, validContent) => {
    return `<mention-component data-label="${validContent}" data-id="${validContent}"></mention-component>`;
  });

  result = result?.replace(INVALID_VARIABLE_REGEX, (match) => {
    return `<mention-component data-label="${match}" data-id="${match}" data-error="true"></mention-component>`;
  });

  return result;
};

export function Mention({ editor, node, updateAttributes, ...props }: NodeViewProps) {
  const [hasError, setHasError] = useState(node.attrs.error || false);

  const updateVariableAttributes = (label: string, error: boolean) => {
    updateAttributes({ label, error: `${error}` });
    setHasError(error);
  };

  //In case of an invalid variable input, set content to be the label variable  which will include the whole invalid variable
  const renderedNodeViewContent = !node.attrs.label.includes(AUTOCOMPLETE_OPEN_TAG)
    ? `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label}${AUTOCOMPLETE_CLOSE_TAG}`
    : `${node.attrs.label}`;

  return (
    <NodeViewWrapper as={'span'} contentEditable={'false'} suppressContentEditableWarning>
      <NodeViewContent
        as={'span'}
        className={'suggestion'}
        contentEditable
        suppressContentEditableWarning
        data-error={hasError}
        onInput={(event: ChangeEvent<HTMLInputElement>) => {
          const text = event.currentTarget.innerText;
          const regRes = text.match(AUTOCOMPLETE_REGEX_V2);
          const sub = regRes?.[1];
          if (!regRes) {
            if (text.length === 0) {
              props.deleteNode();
              editor.commands.focus();
            }
          } else {
            updateVariableAttributes(sub, false);
          }
        }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          const text = event.currentTarget.innerText;
          const regRes = text.match(AUTOCOMPLETE_REGEX_V2);
          const sub = regRes?.[1];
          if (!regRes) {
            updateVariableAttributes(text, true);
          } else {
            updateVariableAttributes(sub, false);
          }
        }}
      >
        {renderedNodeViewContent}
      </NodeViewContent>
    </NodeViewWrapper>
  );
}

export const CustomMention = ExternalMention.extend({
  name: ExternalMention.name,
  content: 'text*',
  atom: false,
  inline: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      error: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-error'),
        renderHTML: (attributes) => {
          if (!attributes.error) {
            return {};
          }

          return {
            'data-error': attributes.error,
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(Mention, {
      attrs: { contentEditable: 'false' },
      update: () => {
        return true;
      },
    });
  },
  parseHTML() {
    return [
      {
        tag: 'mention-component',
      },
    ];
  },
  renderText({ node }) {
    return node.attrs.error === 'true'
      ? node.attrs.label
      : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;
  },
  renderHTML({ HTMLAttributes, node }) {
    const htmlOutput =
      node.attrs.error === 'true'
        ? node.attrs.label
        : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;

    return ['mention-component', mergeAttributes(HTMLAttributes), htmlOutput];
  },
});

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

      // Set timeout is for a known tiptap error with setting content on initial render (ADD ISSUE URL)
      setTimeout(() => {
        editor.commands.setContent(output);
      });
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
