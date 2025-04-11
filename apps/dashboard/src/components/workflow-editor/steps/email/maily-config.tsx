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
import { HTMLCodeBlockExtension, Variables } from '@maily-to/core/extensions';
import { getVariableSuggestions } from '@maily-to/core/extensions';
import { RepeatExtension, VariableExtension } from '@maily-to/core/extensions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ForView } from './views/for-view';
import { createVariableView } from './views/variable-view';
import { MailyVariablesListView } from './views/maily-variables-list-view';
import { HTMLCodeBlockView } from './views/html-view';
import { CalculateVariablesProps, insertVariableToEditor } from './variables/variables';
import { IsAllowedVariable } from '@/utils/parseStepVariables';

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

export const createEditorBlocks = (props: { track: ReturnType<typeof useTelemetry> }): BlockGroupItem[] => {
  const { track } = props;
  const blocks: BlockGroupItem[] = [];

  blocks.push({
    title: 'Highlights',
    commands: [createHtmlCodeBlock({ track }), createHeaders({ track }), createFooters({ track })],
  });

  blocks.push({
    title: 'All blocks',
    commands: [
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
      createHtmlCodeBlock({ track }),
      createHeaders({ track }),
      createFooters({ track }),
    ],
  });

  // sort command titles alphabetically within each block group
  blocks.forEach((blockGroup) => {
    blockGroup.commands.sort((a, b) => a.title.localeCompare(b.title));
  });

  return blocks;
};

export const createExtensions = (props: {
  calculateVariables: (props: CalculateVariablesProps) => Variables | undefined;
  parsedVariables: { isAllowedVariable: IsAllowedVariable };
  isEnhancedDigestEnabled: boolean;
}) => {
  const { calculateVariables, parsedVariables, isEnhancedDigestEnabled } = props;

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
    VariableExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(createVariableView(parsedVariables.isAllowedVariable), {
          className: 'relative inline-block',
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
      variables: calculateVariables as Variables,
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
