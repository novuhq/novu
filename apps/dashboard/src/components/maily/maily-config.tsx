import { searchSlashCommands, Variable } from '@maily-to/core/extensions';
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
  getSlashCommandSuggestions,
  getVariableSuggestions,
  HTMLCodeBlockExtension,
  RepeatExtension,
  SlashCommandExtension,
  VariableExtension,
  Variables,
} from '@maily-to/core/extensions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor, Editor as TiptapEditor, NodeViewProps } from '@tiptap/core';
import { StepResponseDto } from '@novu/shared';

import { createFooters } from '@/components/maily/blocks/footers';
import { createHeaders } from '@/components/maily/blocks/headers';
import { createHtmlCodeBlock } from '@/components/maily/blocks/html';
import { createDigestBlock } from '@/components/maily//blocks/digest';
import { createCards } from '@/components/maily//blocks/cards';
import { ForView } from '@/components/maily/views/for-view';
import { HTMLCodeBlockView } from '@/components/maily/views/html-view';
import { useTelemetry } from '@/hooks/use-telemetry';
import { isInsideRepeatBlock, resolveRepeatBlockAlias } from './repeat-block-aliases';
import { IsAllowedVariable, LiquidVariable, ParsedVariables } from '@/utils/parseStepVariables';
import { TranslationKey } from '@/types/translations';
import { CalculateVariablesProps, insertVariableToEditor } from './variables';
import { createTranslationExtension } from '../workflow-editor/steps/email/translations';
import { ForwardRefExoticComponent } from 'react';

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

export const createExtensions = ({
  handleCalculateVariables,
  parsedVariables,
  blocks,
  onCreateNewVariable,
  isPayloadSchemaEnabled = false,
  isTranslationEnabled = false,
  translationKeys = [],
  onCreateNewTranslationKey,
  variableSuggestionsPopover,
  renderVariable,
  createVariableNodeView,
}: {
  handleCalculateVariables: (props: CalculateVariablesProps) => Variables | undefined;
  parsedVariables: ParsedVariables;
  blocks: BlockGroupItem[];
  onCreateNewVariable?: (variableName: string) => Promise<void>;
  isPayloadSchemaEnabled?: boolean;
  isTranslationEnabled?: boolean;
  translationKeys?: TranslationKey[];
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>;
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
}) => {
  const extensions = [
    RepeatExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(ForView, {
          className: 'mly-relative',
        });
      },
      addAttributes() {
        // Find the first array property from the parsed variables that starts with 'payload.'
        // Since the actual user payload is nested under payload.payload, we need to filter for payload arrays
        const payloadArrays = parsedVariables.arrays.filter((array) => array.name.startsWith('payload.'));
        const firstArrayVariable = payloadArrays.length > 0 ? payloadArrays[0].name : 'payload.items';

        return {
          each: {
            default: firstArrayVariable,
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
        return ReactNodeViewRenderer(
          createVariableNodeView(parsedVariables.variables, parsedVariables.isAllowedVariable),
          {
            // the variable pill is 3px smaller than the default text size, but never smaller than 12px
            className: 'relative inline-block text-[max(12px,calc(1em-3px))] h-5',
            as: 'div',
          }
        );
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

          // Check if this is a new variable by seeing if it's a payload variable that doesn't exist in our schema
          const isPayloadVariable = props.id.startsWith('payload.') || props.id.startsWith('current.payload.');
          const existsInSchema = parsedVariables.variables.some((v) => v.name === props.id);
          const isNewVariable =
            isPayloadSchemaEnabled &&
            isPayloadVariable &&
            !existsInSchema &&
            props.id !== 'payload' &&
            props.id !== 'current.payload';

          if (isNewVariable) {
            const variableName = props.id.replace('current.payload.', '').replace('payload.', '');
            onCreateNewVariable?.(variableName);

            insertVariableToEditor({
              query,
              editor,
              range,
            });
          } else {
            // Calculate aliasFor before validation to properly handle "current." variables
            const aliasFor = resolveRepeatBlockAlias(props.id, editor);
            const isAllowed = parsedVariables.isAllowedVariable({
              name: props.id,
              aliasFor,
            });

            if (!isAllowed) {
              return;
            }

            insertVariableToEditor({
              query,
              editor,
              range,
            });
          }
        },
      },
      // variable pills inside buttons and bubble menus (repeat, showIf...)
      renderVariable,
      variables: handleCalculateVariables as Variables,
      variableSuggestionsPopover,
    }),
    HTMLCodeBlockExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(HTMLCodeBlockView, {
          className: 'mly-relative',
        });
      },
    }),
    createTranslationExtension(isTranslationEnabled, translationKeys, onCreateNewTranslationKey),
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
              return commands.updateButtonAttributes?.({ ...attrs, aliasFor: aliasFor ?? null });
            }

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
