import type { BlockGroupItem } from '@novu/maily-core/blocks';
import {
  getSlashCommandSuggestions,
  getVariableSuggestions,
  searchSlashCommands,
  SlashCommandExtension,
  Variable,
  VariableExtension,
  Variables,
} from '@novu/maily-core/extensions';
import { TRANSLATION_NAMESPACE_SEPARATOR, TRANSLATION_TRIGGER_CHARACTER } from '@novu/shared';
import type { AnyExtension, Editor, NodeViewProps } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ForwardRefExoticComponent, useMemo } from 'react';
import { useDataRef } from '@/hooks/use-data-ref';
import { IsAllowedVariable, LiquidVariable, ParsedVariables } from '@/utils/parseStepVariables';
import { CalculateVariablesProps, insertVariableToEditor } from '../../../../maily/variables';
import {
  CardActionItemExtension,
  CardActionsExtension,
  CardDividerExtension,
  CardFieldExtension,
  CardFieldsExtension,
  CardImageExtension,
  CardLinkExtension,
  CardTextExtension,
  ChatKit,
} from './nodes';

const VARIABLE_TRIGGER_CHARACTER = '{{';

export const DEFAULT_CHAT_EDITOR_CONFIG = {
  hasMenuBar: false,
  wrapClassName: 'min-h-0 flex flex-col w-full',
  bodyClassName:
    'bg-transparent! flex flex-col basis-full border-none! rounded-none! mt-0! p-0! shadow-none! [&>div]:basis-full [&_.tiptap]:h-full [&_.tiptap]:min-h-12 [&_.tiptap]:outline-none',
  /**
   * Space between each top-level card block. `[&>*+*]` targets sibling
   * ProseMirror block children so every block after the first gets a
   * consistent vertical gap — mirrors the `gap-2` used by the preview.
   *
   * We also override ProseMirror's default `.ProseMirror-selectednode`
   * highlight (a chunky blue wash on any selected node) with a subtle
   * inset ring, so clicking into a field/action/divider shows a clean
   * selection state instead of bathing the block in blue.
   */
  contentClassName:
    '[&>*+*]:mt-2 [&_.ProseMirror-selectednode]:bg-transparent [&_.ProseMirror-selectednode]:outline-none [&_.ProseMirror-selectednode]:rounded-md [&_.ProseMirror-selectednode]:ring-1 [&_.ProseMirror-selectednode]:ring-primary-200',
  autofocus: false as const,
};

type UseCreateChatExtensionsProps = {
  handleCalculateVariables: (props: CalculateVariablesProps) => Variables | undefined;
  parsedVariables: ParsedVariables;
  blocks: BlockGroupItem[];
  onCreateNewVariable?: (variableName: string) => Promise<void>;
  variableSuggestionsPopover?: ForwardRefExoticComponent<{
    items: Variable[];
    onSelectItem: (item: Variable) => void;
  }>;
  renderVariable: (opts: {
    variable: Variable;
    fallback?: string;
    editor: Editor;
    from: 'content-variable' | 'bubble-variable' | 'button-variable';
  }) => JSX.Element | null;
  createVariableNodeView: (
    variables: LiquidVariable[],
    isAllowedVariable: IsAllowedVariable
  ) => (props: NodeViewProps) => JSX.Element;
};

export const useCreateChatExtensions = (props: UseCreateChatExtensionsProps) => {
  const propsRef = useDataRef(props);

  return useMemo(() => {
    const {
      handleCalculateVariables,
      parsedVariables,
      blocks,
      onCreateNewVariable,
      variableSuggestionsPopover,
      renderVariable,
      createVariableNodeView,
    } = propsRef.current;

    const extensions: AnyExtension[] = [
      ChatKit,
      CardTextExtension,
      CardDividerExtension,
      CardLinkExtension,
      CardImageExtension,
      CardFieldsExtension,
      CardFieldExtension,
      CardActionsExtension,
      CardActionItemExtension,
      SlashCommandExtension.configure({
        suggestion: {
          ...getSlashCommandSuggestions(blocks),
          items: ({ query, editor }) => searchSlashCommands(query, editor, blocks),
        },
      }),
      VariableExtension.extend({
        addNodeView() {
          return ReactNodeViewRenderer(
            createVariableNodeView(parsedVariables.variables, parsedVariables.isAllowedVariable),
            {
              className: 'relative inline-block text-[max(12px,calc(1em-3px))] h-5',
              as: 'div',
            }
          );
        },
      }).configure({
        suggestion: {
          ...getVariableSuggestions(VARIABLE_TRIGGER_CHARACTER),
          command: ({ editor, range, props: suggestionProps }) => {
            const query = `${suggestionProps.id}}}`;
            const existsInSchema = parsedVariables.variables.some((v) => v.name === suggestionProps.id);
            const isNewVariable =
              !existsInSchema && !(suggestionProps.id.startsWith('current.') || suggestionProps.id === 'current');

            if (suggestionProps.id === TRANSLATION_NAMESPACE_SEPARATOR) {
              editor.chain().focus().insertContentAt(range, TRANSLATION_TRIGGER_CHARACTER).run();

              return;
            }

            if (isNewVariable) {
              onCreateNewVariable?.(suggestionProps.id);
            }

            insertVariableToEditor({ query, editor, range });
          },
        },
        renderVariable,
        variables: handleCalculateVariables as Variables,
        variableSuggestionsPopover,
      }),
    ];

    return extensions;
  }, [propsRef]);
};
