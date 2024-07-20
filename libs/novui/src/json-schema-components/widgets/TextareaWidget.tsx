import { getInputProps, WidgetProps } from '@rjsf/utils';
import { TextInputType, Textarea } from '../../components';
import '@mantine/tiptap/styles.css';
import { RichTextEditor } from '@mantine/tiptap';
import { markInputRule, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import { ReactRenderer } from '@tiptap/react';

import { MentionList, MentionRef } from './MentionList';
import { Input } from '@mantine/core';
import { css, cx } from '../../../styled-system/css';
import Document from '@tiptap/extension-document';
import Mention from '@tiptap/extension-mention';
import Strike from '@tiptap/extension-strike';

import { input } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';
import { useEffect, useRef } from 'react';

const inputRegex = /(?:^|\s)((?:~)((?:[^~]+))(?:~))$/;

export const TextareaWidget = (props: WidgetProps) => {
  const { type, value, label, schema, formContext, onChange, options, required, readonly, rawErrors, disabled } = props;
  const inputProps1 = getInputProps(schema, type, options);

  const [variantProps, inputProps] = input.splitVariantProps({});
  const [cssProps, localProps] = splitCssProps(inputProps);
  const variables = formContext;
  // const { onChange, className, rightSection, ...otherProps } = localProps;
  const classNames = input(variantProps);
  const CustomStrike = Strike.extend({
    addInputRules() {
      return [
        markInputRule({
          find: inputRegex,
          type: this.type,
        }),
      ];
    },
  });

  const reactRenderer = useRef<ReactRenderer<MentionRef>>(null);

  const editor = useEditor({
    // parseOptions: {
    //   preserveWhitespace: true,
    // },
    extensions: [
      // StarterKit,
      CustomStrike,
      Document,
      Paragraph,
      Text,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        renderHTML: ({ options, node }) => {
          const closeTag = '}}';

          return [
            'span',
            {
              style: `border: 1px solid #ccc; padding: 2px 4px; border-radius: 4px;`,
            },
            `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}${closeTag}`,
          ];
        },
        renderText: ({ options, node }) => {
          const closeTag = '}}';

          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}${closeTag}`;
        },
        suggestion: {
          items: ({ query }) => {
            return variables
              ?.map((variable) => {
                return { label: variable, id: variable };
              })
              .filter((item) => item.label.includes(query));
          },
          char: '{{',
          render() {
            return {
              onStart: (props) => {
                reactRenderer.current = new ReactRenderer(MentionList, {
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
      }),
    ],
    content: '',
    onBlur: () => {
      console.log('blur editor---', reactRenderer.current?.ref);
    },
    onUpdate: ({ editor }) => {
      const content = editor.isEmpty ? undefined : editor.getText();
      onChange(content);
    },
  });
  const error = rawErrors?.length > 0 && rawErrors;

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(value);
    }
  }, []);

  return (
    <Input.Wrapper
      classNames={classNames}
      className={cx('group', css(cssProps))}
      required={required}
      label={label}
      description={props.schema.description}
      error={error}
    >
      <RichTextEditor classNames={stylesTry} editor={editor}>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Input.Wrapper>
  );

  // return (
  //   <Textarea
  //     description={props.schema.description}
  //     onChange={(event) => {
  //       event.preventDefault();
  //       onChange(event.target.value);
  //     }}
  //     value={value || value === 0 ? value : ''}
  //     required={required}
  //     label={label}
  //     type={inputProps.type as TextInputType}
  //     error={rawErrors?.length > 0 && rawErrors}
  //     readOnly={readonly}
  //     disabled={disabled}
  //   />
  // );
};
const stylesTry = {
  root: css({
    background: 'input.surface !important',
    borderColor: 'input.border !important',
    _groupError: {
      borderColor: 'input.border.error !important',
    },
  }),
  content: css({
    background: 'input.surface !important',
    borderColor: 'input.border !important',
    borderRadius: 'input !important',
    lineHeight: '125 !important',
  }),
};
