import { Color } from '@novu/maily-core/extensions';
import { AnyExtension, Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import TextStyle from '@tiptap/extension-text-style';
import { CARD_TEXT_NODE_NAME } from './card-text';
import { CARD_DIVIDER_NODE_NAME } from './card-divider';
import { CARD_LINK_NODE_NAME } from './card-link';
import { CARD_IMAGE_NODE_NAME } from './card-image';
import { CARD_FIELDS_NODE_NAME } from './card-fields';
import { CARD_ACTIONS_NODE_NAME } from './card-actions';

/**
 * `paragraph` isn't part of the card's wire schema — authored text always
 * serializes to `cardText`. We register it anyway because Maily's
 * `ContentMenu` "+" button hardcodes `state.schema.nodes.paragraph.create(...)`
 * to insert a placeholder that then triggers the slash menu. Without a
 * paragraph node the click silently no-ops.
 *
 * The paragraph is only a transient — our slash commands replace it with
 * a real card block, and the serializer treats any paragraph that survives
 * the round-trip as a `cardText` with `style: plain`.
 */
const CARD_BLOCK_TYPES = [
  CARD_TEXT_NODE_NAME,
  'paragraph',
  CARD_DIVIDER_NODE_NAME,
  CARD_LINK_NODE_NAME,
  CARD_IMAGE_NODE_NAME,
  CARD_FIELDS_NODE_NAME,
  CARD_ACTIONS_NODE_NAME,
].join(' | ');

/**
 * Drop-in replacement for @novu/maily-core's MailyKit. Uses the same `name`
 * so the core's extensions() merge filters out the built-in kit in favor
 * of this one. Restricts the top-level document schema to only our chat
 * card block types — no paragraph / heading / bold / italic / columns /
 * section / repeat / HTML — and wires the minimum Tiptap plumbing
 * (history, dropcursor, gapcursor, placeholder).
 */
export const ChatKit = Extension.create({
  name: 'maily-kit',

  addExtensions() {
    const extensions: AnyExtension[] = [
      Document.extend({
        content: `(${CARD_BLOCK_TYPES})+`,
      }),
      Paragraph,
      Text,
      /**
       * TextStyle + Color aren't used for chat authoring (we have no
       * color picker UI), but Maily's `TextBubbleMenu` is always mounted
       * by the core Editor and its child `TextBubbleContent` reads
       * `editor.storage.color.colors` unconditionally. Registering the
       * Color extension here keeps that read safe without changing
       * schema semantics — the menu itself never becomes visible because
       * our schema has no inline bold/italic selection to show it on.
       */
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      History,
      Dropcursor.configure({
        color: '#C1DDFB',
        width: 2,
        class: 'ProseMirror-dropcursor',
      }),
      Gapcursor,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === CARD_TEXT_NODE_NAME) {
            return `Write something or / to see commands`;
          }

          return '';
        },
        includeChildren: true,
      }),
    ];

    return extensions;
  },
});
