import {
  BlockGroupItem,
  BlockItem,
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
  getSlashCommandSuggestions,
  getVariableSuggestions,
  HTMLCodeBlockExtension,
  ImageExtension,
  InlineImageExtension,
  LinkExtension,
  ButtonAttributes as MailyButtonAttributes,
  ImageAttributes as MailyImageAttributes,
  InlineImageAttributes as MailyInlineImageAttributes,
  LinkAttributes as MailyLinkAttributes,
  LogoAttributes as MailyLogoAttributes,
  RepeatExtension,
  SlashCommandExtension,
  searchSlashCommands,
  Variable,
  VariableExtension,
  Variables,
} from '@maily-to/core/extensions';
import { StepResponseDto, TRANSLATION_NAMESPACE_SEPARATOR, TRANSLATION_TRIGGER_CHARACTER } from '@novu/shared';
import type { Editor, NodeViewProps, Editor as TiptapEditor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ForwardRefExoticComponent } from 'react';
import { createCards } from '@/components/maily//blocks/cards';
import { createDigestBlock } from '@/components/maily//blocks/digest';
import { createFooters } from '@/components/maily/blocks/footers';
import { createHeaders } from '@/components/maily/blocks/headers';
import { createHtmlCodeBlock } from '@/components/maily/blocks/html';
import { ForView } from '@/components/maily/views/for-view';
import { HTMLCodeBlockView } from '@/components/maily/views/html-view';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TranslationKey } from '@/types/translations';
import { IsAllowedVariable, LiquidVariable, ParsedVariables } from '@/utils/parseStepVariables';
import { createTranslationExtension } from '../workflow-editor/steps/email/translations';
import { isInsideRepeatBlock, resolveRepeatBlockAlias } from './repeat-block-aliases';
import { CalculateVariablesProps, insertVariableToEditor } from './variables';

export const VARIABLE_TRIGGER_CHARACTER = '{{';

type BlockType =
  | 'blockquote'
  | 'bulletList'
  | 'button'
  | 'columns'
  | 'divider'
  | 'hardBreak'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'image'
  | 'inlineImage'
  | 'orderedList'
  | 'repeat'
  | 'section'
  | 'spacer'
  | 'text'
  | 'cards'
  | 'headers'
  | 'footers'
  | 'digest'
  | 'htmlCodeBlock';

export type BlockConfig = {
  highlights: {
    enabled: boolean;
    title: string;
    blocks: Array<{
      type: BlockType;
      enabled: boolean;
      order: number;
    }>;
  };
  allBlocks: {
    enabled: boolean;
    title: string;
    blocks: Array<{
      type: BlockType;
      enabled: boolean;
      order: number;
    }>;
    sortAlphabetically: boolean;
  };
};

export const DEFAULT_BLOCK_CONFIG: BlockConfig = {
  highlights: {
    enabled: true,
    title: 'Highlights',
    blocks: [
      { type: 'cards', enabled: true, order: 0 },
      { type: 'htmlCodeBlock', enabled: true, order: 1 },
      { type: 'headers', enabled: true, order: 2 },
      { type: 'footers', enabled: true, order: 3 },
      { type: 'digest', enabled: true, order: 4 },
    ],
  },
  allBlocks: {
    enabled: true,
    title: 'All blocks',
    blocks: [
      { type: 'blockquote', enabled: true, order: 0 },
      { type: 'bulletList', enabled: true, order: 1 },
      { type: 'button', enabled: true, order: 2 },
      { type: 'cards', enabled: true, order: 3 },
      { type: 'columns', enabled: true, order: 4 },
      { type: 'digest', enabled: true, order: 4 },
      { type: 'divider', enabled: true, order: 5 },
      { type: 'footers', enabled: true, order: 3 },
      { type: 'hardBreak', enabled: true, order: 6 },
      { type: 'headers', enabled: true, order: 2 },
      { type: 'heading1', enabled: true, order: 7 },
      { type: 'heading2', enabled: true, order: 8 },
      { type: 'heading3', enabled: true, order: 9 },
      { type: 'htmlCodeBlock', enabled: true, order: 1 },
      { type: 'image', enabled: true, order: 10 },
      { type: 'inlineImage', enabled: true, order: 11 },
      { type: 'orderedList', enabled: true, order: 12 },
      { type: 'repeat', enabled: true, order: 13 },
      { type: 'section', enabled: true, order: 14 },
      { type: 'spacer', enabled: true, order: 15 },
      { type: 'text', enabled: true, order: 16 },
    ],
    sortAlphabetically: true,
  },
};

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
  blockConfig?: Partial<BlockConfig>;
}): BlockGroupItem[] => {
  const { track, digestStepBeforeCurrent, blockConfig: userConfig } = props;

  // Merge user config with defaults
  const config: BlockConfig = {
    highlights: { ...DEFAULT_BLOCK_CONFIG.highlights, ...userConfig?.highlights },
    allBlocks: { ...DEFAULT_BLOCK_CONFIG.allBlocks, ...userConfig?.allBlocks },
  };

  const blocks: BlockGroupItem[] = [];

  // Create block type to command mapping for highlights
  const blocksMap: Record<BlockType, () => BlockItem | null> = {
    cards: () => createCards({ track }),
    htmlCodeBlock: () => createHtmlCodeBlock({ track }),
    headers: () => createHeaders({ track }),
    footers: () => createFooters({ track }),
    digest: () => (digestStepBeforeCurrent ? createDigestBlock({ track, digestStepBeforeCurrent }) : null),
    blockquote: () => blockquote,
    bulletList: () => bulletList,
    button: () => button,
    columns: () => columns,
    divider: () => divider,
    hardBreak: () => hardBreak,
    heading1: () => heading1,
    heading2: () => heading2,
    heading3: () => heading3,
    image: () => image,
    inlineImage: () => inlineImage,
    orderedList: () => orderedList,
    repeat: () => repeat,
    section: () => section,
    spacer: () => spacer,
    text: () => text,
  };

  // Build highlights section
  if (config.highlights.enabled) {
    const enabledHighlightBlocks = config.highlights.blocks
      .filter((block) => block.enabled)
      .filter((block) => block.type !== 'digest' || digestStepBeforeCurrent) // Only include digest if available
      .sort((a, b) => a.order - b.order)
      .map((blockConfig) => {
        const createCommand = blocksMap[blockConfig.type];
        return createCommand?.();
      })
      .filter((command): command is NonNullable<typeof command> => command !== null);

    if (enabledHighlightBlocks.length > 0) {
      blocks.push({
        title: config.highlights.title,
        commands: enabledHighlightBlocks,
      });
    }
  }

  // Build all blocks section
  if (config.allBlocks.enabled) {
    const allBlockCommands = [];

    // Add base blocks
    const enabledBaseBlocks = config.allBlocks.blocks
      .filter((block) => block.enabled)
      .sort((a, b) => a.order - b.order)
      .map((blockConfig) => {
        const createCommand = blocksMap[blockConfig.type];
        return createCommand?.();
      })
      .filter((el) => !!el);

    allBlockCommands.push(...enabledBaseBlocks);

    // Sort alphabetically if enabled
    if (config.allBlocks.sortAlphabetically) {
      allBlockCommands.sort((a, b) => a?.title?.localeCompare(b?.title ?? '') ?? 0);
    }

    if (allBlockCommands.length > 0) {
      blocks.push({
        title: config.allBlocks.title,
        commands: allBlockCommands,
      });
    }
  }

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

          if (props.id === TRANSLATION_NAMESPACE_SEPARATOR) {
            // just insert "{{t." (not closed) to trigger the translation extension
            editor.chain().focus().insertContentAt(range, TRANSLATION_TRIGGER_CHARACTER).run();

            return;
          }

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
