import { createFooters } from '@/components/workflow-editor/steps/email/blocks/footers';
import { createHeaders } from '@/components/workflow-editor/steps/email/blocks/headers';
import { createHtmlCodeBlock } from '@/components/workflow-editor/steps/email/blocks/html';
import { useTelemetry } from '@/hooks/use-telemetry';
import {
  BlockGroupItem,
  blockquote,
  bulletList,
  button,
  columns,
  divider,
  hardBreak,
  heading1,
  heading2,
  heading3,
  image,
  inlineImage,
  orderedList,
  repeat,
  section,
  spacer,
  text,
} from '@maily-to/core/blocks';
import {
  getSlashCommandSuggestions,
  getVariableSuggestions,
  HTMLCodeBlockExtension,
  RepeatExtension,
  SlashCommandExtension,
  VariableExtension,
  Variables,
} from '@maily-to/core/extensions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { searchSlashCommands } from '@maily-to/core-digest/extensions';
import { StepResponseDto } from '@novu/shared';
import { createDigestBlock } from './blocks/digest';
import {
  CalculateVariablesProps,
  insertVariableToEditor,
  isInsideRepeatBlock,
  VariableFrom,
} from './variables/variables';
import { ForView } from './views/for-view';
import { createVariableView } from './views/variable-view';
import { MailyVariablesListView } from './views/maily-variables-list-view';
import { HTMLCodeBlockView } from './views/html-view';
import { VariablePill } from '@/components/variable/variable-pill';
import { IsAllowedVariable } from '@/utils/parseStepVariables';

import type { Editor as TiptapEditor } from '@tiptap/core';
export const VARIABLE_TRIGGER_CHARACTER = '{{';

/**
 * Fixed width (600px) for the email editor and rendered content.
 * This width ensures optimal compatibility across email clients
 * while maintaining good readability on all devices.
 * (Hardcoded in Maily)
 */
export const MAILY_EMAIL_WIDTH = 600;

export const DEFAULT_EDITOR_CONFIG = {
  hasMenuBar: false,
  wrapClassName: 'min-h-0 max-h-full flex flex-col w-full h-full',
  bodyClassName: '!bg-transparent flex flex-col basis-full !border-none !mt-0 [&>div]:basis-full [&_.tiptap]:h-full',
  /**
   * Special characters like "{{" and "/" can trigger event menus in the editor.
   * When autofocus is enabled and the last line ends with one of these characters,
   * the menu will automatically open and try to attach to the canvas while the
   * drawer animation is still in progress, resulting in shifted menu layout.
   *
   * Triggering menu should be explicit and not happen automatically upon opening editor,
   * so we disable autofocus.
   */
  autofocus: false,
};

export const createEditorBlocks = (props: {
  track: ReturnType<typeof useTelemetry>;
  digestStepBeforeCurrent?: StepResponseDto;
  isEnhancedDigestEnabled: boolean;
}): BlockGroupItem[] => {
  const { track, digestStepBeforeCurrent, isEnhancedDigestEnabled } = props;
  const blocks: BlockGroupItem[] = [];

  const highlightBlocks = [createHtmlCodeBlock({ track }), createHeaders({ track }), createFooters({ track })];

  if (isEnhancedDigestEnabled && digestStepBeforeCurrent) {
    highlightBlocks.unshift(createDigestBlock({ track, digestStepBeforeCurrent }));
  }

  blocks.push({
    title: 'Highlights',
    commands: highlightBlocks,
  });

  const allBlocks = [
    blockquote,
    bulletList,
    button,
    columns,
    divider,
    hardBreak,
    heading1,
    heading2,
    heading3,
    image,
    inlineImage,
    orderedList,
    repeat,
    section,
    spacer,
    text,
    ...highlightBlocks,
  ];

  blocks.push({
    title: 'All blocks',
    commands: allBlocks,
  });

  // sort command titles alphabetically within each block group
  blocks.forEach((blockGroup) => {
    blockGroup.commands.sort((a, b) => a.title.localeCompare(b.title));
  });

  return blocks;
};

const getAvailableBlocks = (blocks: BlockGroupItem[], editor: TiptapEditor | null) => {
  // 'Repeat' and 'Digest' blocks can't be used inside another 'Repeat' block
  const isInsideRepeat = editor && isInsideRepeatBlock(editor);

  if (isInsideRepeat) {
    const filteredBlocks = ['Repeat', 'Digest block'];

    return blocks.map((block) => ({
      ...block,
      commands: block.commands.filter((cmd) => !filteredBlocks.includes(cmd.title)),
    }));
  }

  return blocks;
};

export const createExtensions = (props: {
  handleCalculateVariables: (props: CalculateVariablesProps) => Variables | undefined;
  parsedVariables: { isAllowedVariable: IsAllowedVariable };
  blocks: BlockGroupItem[];
  isEnhancedDigestEnabled: boolean;
}) => {
  const { handleCalculateVariables, parsedVariables, blocks, isEnhancedDigestEnabled } = props;

  return [
    RepeatExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(ForView, {
          className: 'mly-relative',
        });
      },
      addAttributes() {
        return {
          each: {
            default: 'payload.items',
          },
        };
      },
    }),
    SlashCommandExtension.configure({
      suggestion: {
        ...getSlashCommandSuggestions(blocks),
        items: ({ query, editor }) => {
          return searchSlashCommands(query, editor, getAvailableBlocks(blocks, editor));
        },
      },
    }),
    VariableExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(createVariableView(parsedVariables.isAllowedVariable), {
          // the variable pill is 3px smaller than the default text size, but never smaller than 12px
          className: 'relative inline-block text-[max(12px,calc(1em-3px))] h-5',
          as: 'div',
        });
      },
      addAttributes() {
        const attributes = this.parent?.();
        return {
          ...attributes,
          aliasFor: {
            default: null,
          },
        };
      },
    }).configure({
      suggestion: {
        ...getVariableSuggestions(VARIABLE_TRIGGER_CHARACTER),
        command: ({ editor, range, props }) => {
          const query = props.id + '}}';

          insertVariableToEditor({
            query,
            editor,
            range,
            isAllowedVariable: parsedVariables.isAllowedVariable,
            isEnhancedDigestEnabled,
          });
        },
      },
      // variable pills in bubble menus (repeat, showIf...)
      renderVariable: (opts) => {
        return (
          <VariablePill
            variableName={opts.variable.name}
            hasFilters={false}
            className="h-5 text-xs"
            from={opts.from as VariableFrom}
          />
        );
      },
      variables: handleCalculateVariables as Variables,
      variableSuggestionsPopover: MailyVariablesListView,
    }),
    HTMLCodeBlockExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(HTMLCodeBlockView, {
          className: 'mly-relative',
        });
      },
    }),
  ];
};
