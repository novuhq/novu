import { searchSlashCommands } from '@maily-to/core/extensions';
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
  ButtonExtension,
  ButtonAttributes as MailyButtonAttributes,
  ImageExtension,
  ImageAttributes as MailyImageAttributes,
  InlineImageExtension,
  InlineImageAttributes as MailyInlineImageAttributes,
  LogoAttributes as MailyLogoAttributes,
  LinkExtension,
  LinkAttributes as MailyLinkAttributes,
} from '@maily-to/core/extensions';
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
import type { Editor as TiptapEditor } from '@tiptap/core';
import { StepResponseDto } from '@novu/shared';

import { VariablePill } from '@/components/variable/variable-pill';
import { createFooters } from '@/components/workflow-editor/steps/email/blocks/footers';
import { createHeaders } from '@/components/workflow-editor/steps/email/blocks/headers';
import { createHtmlCodeBlock } from '@/components/workflow-editor/steps/email/blocks/html';
import { useTelemetry } from '@/hooks/use-telemetry';
import { createDigestBlock } from './blocks/digest';
import {
  CalculateVariablesProps,
  insertVariableToEditor,
  isInsideRepeatBlock,
  resolveRepeatBlockAlias,
  VariableFrom,
} from './variables/variables';
import { ForView } from './views/for-view';
import { HTMLCodeBlockView } from './views/html-view';
import { ParsedVariables } from '@/utils/parseStepVariables';
import { MailyVariablesListView } from './views/maily-variables-list-view';
import { createVariableView } from './views/variable-view';
import { createCards } from './blocks/cards';
export const VARIABLE_TRIGGER_CHARACTER = '{{';

declare module '@tiptap/core' {
  interface ButtonAttributes extends MailyButtonAttributes {
    aliasFor: string | null;
  }

  interface ImageAttributes extends MailyImageAttributes {
    aliasFor: string | null;
  }

  interface InlineImageAttributes extends MailyInlineImageAttributes {
    aliasFor: string | null;
  }

  interface LogoAttributes extends MailyLogoAttributes {
    aliasFor: string | null;
  }

  interface LinkAttributes extends MailyLinkAttributes {
    aliasFor: string | null;
  }
}

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
  contentClassName: 'pb-10',
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
}): BlockGroupItem[] => {
  const { track, digestStepBeforeCurrent } = props;
  const blocks: BlockGroupItem[] = [];

  const highlightBlocks = [createHtmlCodeBlock({ track }), createHeaders({ track }), createFooters({ track })];

  highlightBlocks.unshift(createCards({ track }));

  if (digestStepBeforeCurrent) {
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
    const filteredBlocks = ['Repeat', 'Digest'];

    return blocks.map((block) => ({
      ...block,
      commands: block.commands.filter((cmd) => !filteredBlocks.includes(cmd.title)),
    }));
  }

  return blocks;
};

export const createExtensions = (props: {
  handleCalculateVariables: (props: CalculateVariablesProps) => Variables | undefined;
  parsedVariables: ParsedVariables;
  blocks: BlockGroupItem[];
}) => {
  const { handleCalculateVariables, parsedVariables, blocks } = props;

  const extensions = [
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
        return ReactNodeViewRenderer(createVariableView(parsedVariables.variables, parsedVariables.isAllowedVariable), {
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
          });
        },
      },
      // variable pills in bubble menus (repeat, showIf...)
      renderVariable: (opts) => {
        return (
          <VariablePill variableName={opts.variable.name} className="h-5 text-xs" from={opts.from as VariableFrom} />
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

  extensions.push(
    ButtonExtension.extend({
      addAttributes() {
        const attributes = this.parent?.();

        return {
          ...attributes,
          aliasFor: {
            default: null,
          },
        };
      },

      addCommands() {
        const commands = this.parent?.();
        const editor = this.editor;

        if (!commands) return {};

        return {
          ...commands,
          updateButtonAttributes: (attrs: MailyButtonAttributes) => {
            const { text, url, isTextVariable, isUrlVariable } = attrs;

            if (isTextVariable || isUrlVariable) {
              const aliasFor = resolveRepeatBlockAlias(isTextVariable ? (text ?? '') : (url ?? ''), editor);
              // @ts-expect-error - the core and core-digest collides
              return commands.updateButtonAttributes?.({ ...attrs, aliasFor: aliasFor ?? null });
            }

            // @ts-expect-error - the core and core-digest collides
            return commands.updateButtonAttributes?.(attrs);
          },
        };
      },
    }),
    ImageExtension.extend({
      addAttributes() {
        const attributes = this.parent?.();

        return {
          ...attributes,
          aliasFor: {
            default: null,
          },
        };
      },

      addCommands() {
        const commands = this.parent?.();
        const editor = this.editor;

        if (!commands) return {};

        return {
          ...commands,
          updateImageAttributes: (attrs) => {
            const { src, isSrcVariable, externalLink, isExternalLinkVariable } = attrs;

            if (isSrcVariable || isExternalLinkVariable) {
              const aliasFor = resolveRepeatBlockAlias(isSrcVariable ? (src ?? '') : (externalLink ?? ''), editor);
              return commands.updateImageAttributes?.({ ...attrs, aliasFor: aliasFor ?? null });
            }

            return commands.updateImageAttributes?.(attrs);
          },
        };
      },
    }),
    InlineImageExtension.extend({
      addAttributes() {
        const attributes = this.parent?.();

        return {
          ...attributes,
          aliasFor: {
            default: null,
          },
        };
      },

      addCommands() {
        const commands = this.parent?.();
        const editor = this.editor;

        if (!commands) return {};

        return {
          ...commands,
          updateInlineImageAttributes: (attrs) => {
            const { src, isSrcVariable, externalLink, isExternalLinkVariable } = attrs;

            if (isSrcVariable || isExternalLinkVariable) {
              const aliasFor = resolveRepeatBlockAlias(isSrcVariable ? (src ?? '') : (externalLink ?? ''), editor);
              return commands.updateInlineImageAttributes?.({ ...attrs, aliasFor: aliasFor ?? null });
            }

            return commands.updateInlineImageAttributes?.(attrs);
          },
        };
      },
    }),
    // @ts-expect-error - the core and core-digest collides
    LinkExtension.extend({
      addAttributes() {
        const attributes = this.parent?.();

        return {
          ...attributes,
          aliasFor: {
            default: null,
          },
        };
      },

      addCommands() {
        const commands = this.parent?.();
        const editor = this.editor;

        if (!commands) return {};

        return {
          ...commands,
          updateLinkAttributes: (attrs: MailyLinkAttributes) => {
            const { href, isUrlVariable } = attrs;

            if (isUrlVariable) {
              const aliasFor = resolveRepeatBlockAlias(href ?? '', editor);
              // @ts-expect-error - the core and core-digest collides
              return commands.updateLinkAttributes?.({ ...attrs, aliasFor: aliasFor ?? null });
            }

            // @ts-expect-error - the core and core-digest collides
            return commands.updateLinkAttributes?.(attrs);
          },
        };
      },
    })
  );

  return extensions;
};
