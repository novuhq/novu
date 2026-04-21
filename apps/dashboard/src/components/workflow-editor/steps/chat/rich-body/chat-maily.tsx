import { Editor as MailyEditor } from '@novu/maily-core';
import type { BlockGroupItem } from '@novu/maily-core/blocks';
import { Variable } from '@novu/maily-core/extensions';
import type { Editor, NodeViewProps, Editor as TiptapEditor } from '@tiptap/core';
import type { JSONContent, Editor as TiptapEditorReact } from '@tiptap/react';
import { ForwardRefExoticComponent, HTMLAttributes, useCallback, useMemo } from 'react';
import { useDataRef } from '@/hooks/use-data-ref';
import { VariableFrom } from '@/components/maily/types';
import { calculateVariables } from '@/components/maily/variables';
import { MailyVariablesListView } from '@/components/maily/views/maily-variables-list-view';
import { createVariableNodeView as defaultCreateVariableNodeView } from '@/components/maily/views/variable-view';
import { EnhancedParsedVariables, IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { cn } from '@/utils/ui';
import { ChatEditorProvider } from './chat-editor-context';
import { createChatBlocks } from './chat-maily-blocks';
import { DEFAULT_CHAT_EDITOR_CONFIG, useCreateChatExtensions } from './chat-maily-config';

type ChatMailyProps = HTMLAttributes<HTMLDivElement> & {
  initialContent: JSONContent;
  onChange?: (doc: JSONContent) => void;
  className?: string;
  children?: React.ReactNode;
  variables?: EnhancedParsedVariables;
  blocks?: BlockGroupItem[];
  onCreateNewVariable?: (variable: string) => Promise<void>;
  isPayloadSchemaEnabled?: boolean;
  variableSuggestionsPopover?: ForwardRefExoticComponent<{
    items: Variable[];
    onSelectItem: (item: Variable) => void;
  }>;
  renderVariable?: (opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  }) => JSX.Element | null;
  createVariableNodeView?: (
    variables: LiquidVariable[],
    isAllowedVariable: IsAllowedVariable
  ) => (props: NodeViewProps) => JSX.Element;
};

/**
 * Thin wrapper around `@novu/maily-core`'s Tiptap editor, configured
 * for chat card authoring. Unlike the email Maily wrapper, the chat
 * editor:
 *   - restricts the ProseMirror schema to the card block set via `ChatKit`
 *     (no paragraphs, headings, marks, columns, buttons, etc.)
 *   - does not persist TipTap JSON to the form — the parent converts
 *     `editor.getJSON()` into the backend `CardElement` shape via the
 *     chat card serializer
 *
 * Kept pure: no workflow-specific logic here. Variable resolution and
 * payload schema wiring are supplied by the parent via `variables`
 * and `renderVariable`, mirroring `Maily`'s email contract.
 */
export const ChatMaily = ({
  initialContent,
  onChange,
  className,
  children,
  variables = {
    primitives: [],
    arrays: [],
    namespaces: [],
    enhancedVariables: [],
    variables: [],
    isAllowedVariable: () => false,
  },
  blocks,
  isPayloadSchemaEnabled,
  onCreateNewVariable = () => Promise.resolve(),
  variableSuggestionsPopover = MailyVariablesListView,
  renderVariable = () => null,
  createVariableNodeView = defaultCreateVariableNodeView,
  ...rest
}: ChatMailyProps) => {
  const primitives = useMemo(
    () => variables?.primitives.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.primitives]
  );
  const arrays = useMemo(
    () => variables?.arrays.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.arrays]
  );
  const namespaces = useMemo(
    () => variables?.namespaces.map((v) => ({ name: v.name, required: false })) ?? [],
    [variables?.namespaces]
  );

  const calculateVariablesDataRef = useDataRef({
    primitives,
    arrays,
    namespaces,
    isAllowedVariable: variables?.isAllowedVariable ?? (() => false),
    isPayloadSchemaEnabled,
  });

  const handleCalculateVariables = useCallback(
    ({ query, editor, from }: { query: string; editor: TiptapEditor; from: VariableFrom }) => {
      return calculateVariables({
        ...calculateVariablesDataRef.current,
        query,
        editor,
        from,
      });
    },
    [calculateVariablesDataRef]
  );

  const resolvedBlocks = useMemo(() => blocks ?? createChatBlocks(), [blocks]);

  const extensions = useCreateChatExtensions({
    handleCalculateVariables,
    parsedVariables: variables,
    blocks: resolvedBlocks,
    onCreateNewVariable,
    variableSuggestionsPopover,
    renderVariable,
    createVariableNodeView,
  });

  const onUpdate = useCallback(
    (editor: TiptapEditorReact) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
    [onChange]
  );

  const contextValue = useMemo(
    () => ({
      variables: variables?.variables ?? [],
      isAllowedVariable: variables?.isAllowedVariable ?? (() => false),
    }),
    [variables]
  );

  return (
    <ChatEditorProvider value={contextValue}>
      <div
        className={cn('relative w-full [&_a]:pointer-events-none', className)}
        data-gramm={false}
        data-gramm_editor={false}
        data-enable-grammarly="false"
        {...rest}
      >
        <style>
          {`
            [data-tippy-root] {
              z-index: 50 !important;
            }
            .tippy-box {
              pointer-events: auto;
            }
          `}
        </style>
        <MailyEditor
          config={DEFAULT_CHAT_EDITOR_CONFIG}
          blocks={resolvedBlocks}
          extensions={extensions}
          contentJson={initialContent}
          onUpdate={onUpdate}
        />
      </div>
      {children}
    </ChatEditorProvider>
  );
};
