'use client';

import { AnyExtension, FocusPosition, Editor as TiptapEditor } from '@tiptap/core';
import { EditorContent, JSONContent, useEditor } from '@tiptap/react';

import { useMemo, useRef } from 'react';
import { ColumnsBubbleMenu } from './components/column-menu/columns-bubble-menu';
import { ContentMenu } from './components/content-menu';
import { EditorMenuBar } from './components/editor-menu-bar';
import { HTMLBubbleMenu } from './components/html-menu/html-menu';
import { ImageBubbleMenu } from './components/image-menu/image-bubble-menu';
import { InlineImageBubbleMenu } from './components/inline-image-menu/inline-image-bubble-menu';
import { RepeatBubbleMenu } from './components/repeat-menu/repeat-bubble-menu';
import { SectionBubbleMenu } from './components/section-menu/section-bubble-menu';
import { SpacerBubbleMenu } from './components/spacer-menu/spacer-bubble-menu';
import { TextBubbleMenu } from './components/text-menu/text-bubble-menu';
import { VariableBubbleMenu } from './components/variable-menu/variable-bubble-menu';
import { extensions as defaultExtensions } from './extensions';
import { DEFAULT_SLASH_COMMANDS } from './extensions/slash-command/default-slash-commands';
import { DEFAULT_PLACEHOLDER_URL, MailyContextType, MailyProvider } from './provider';
import { cn } from './utils/classname';
import { replaceDeprecatedNode } from './utils/replace-deprecated';

type PartialMailyContextType = Partial<MailyContextType>;

export type EditorProps = {
  contentHtml?: string;
  contentJson?: JSONContent;
  onUpdate?: (editor: TiptapEditor) => void;
  onCreate?: (editor: TiptapEditor) => void;
  extensions?: AnyExtension[];
  config?: {
    hasMenuBar?: boolean;
    spellCheck?: boolean;
    wrapClassName?: string;
    toolbarClassName?: string;
    contentClassName?: string;
    bodyClassName?: string;
    autofocus?: FocusPosition;
    immediatelyRender?: boolean;
  };
  repeatMenuConfig?: {
    description?: (editor: TiptapEditor) => React.ReactNode;
  };
  editable?: boolean;
} & PartialMailyContextType;

export function Editor(props: EditorProps) {
  const {
    config: {
      wrapClassName = '',
      contentClassName = '',
      bodyClassName = '',
      hasMenuBar = true,
      spellCheck = false,
      autofocus = 'end',
      immediatelyRender = false,
    } = {},
    onCreate,
    onUpdate,
    extensions,
    contentHtml,
    contentJson,
    blocks = DEFAULT_SLASH_COMMANDS,
    editable = true,
    placeholderUrl = DEFAULT_PLACEHOLDER_URL,
    repeatMenuConfig,
  } = props;

  const formattedContent = useMemo(() => {
    if (contentJson) {
      const json =
        contentJson?.type === 'doc'
          ? contentJson
          : ({
              type: 'doc',
              content: contentJson,
            } as JSONContent);

      return replaceDeprecatedNode(json);
    } else if (contentHtml) {
      return contentHtml;
    } else {
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      };
    }
  }, [contentHtml, contentJson, replaceDeprecatedNode]);

  const menuContainerRef = useRef(null);
  const editor = useEditor({
    editorProps: {
      attributes: {
        class: cn(`mly-prose mly-w-full`, contentClassName),
        spellCheck: spellCheck ? 'true' : 'false',
      },
    },
    immediatelyRender,
    onCreate: ({ editor }) => {
      onCreate?.(editor);
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor);
    },
    extensions: defaultExtensions({
      extensions,
      blocks,
    }),
    content: formattedContent,
    autofocus,
    editable,
  });

  if (!editor) {
    return null;
  }

  return (
    <MailyProvider placeholderUrl={placeholderUrl}>
      <div
        className={cn(
          'mly-editor mly-antialiased',
          editor.isEditable ? 'mly-editable' : 'mly-not-editable',
          wrapClassName
        )}
        ref={menuContainerRef}
      >
        {hasMenuBar && <EditorMenuBar config={props.config} editor={editor} />}
        <div className={cn('mly-mt-4 mly-rounded mly-border mly-border-gray-200 mly-bg-white mly-p-4', bodyClassName)}>
          <TextBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <ImageBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <SpacerBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <EditorContent editor={editor} />
          <SectionBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <ColumnsBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <ContentMenu editor={editor} />
          <VariableBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <RepeatBubbleMenu editor={editor} appendTo={menuContainerRef} config={repeatMenuConfig} />
          <HTMLBubbleMenu editor={editor} appendTo={menuContainerRef} />
          <InlineImageBubbleMenu editor={editor} appendTo={menuContainerRef} />
        </div>
      </div>
    </MailyProvider>
  );
}
