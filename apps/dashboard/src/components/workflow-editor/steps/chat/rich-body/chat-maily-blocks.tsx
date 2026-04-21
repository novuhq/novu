import type { BlockGroupItem, BlockItem } from '@novu/maily-core/blocks';
import type { Editor, Range } from '@tiptap/core';
import {
  RiHeading,
  RiImageLine,
  RiLink,
  RiListCheck,
  RiSeparator,
  RiSendPlane2Line,
  RiTextSnippet,
} from 'react-icons/ri';
import {
  CARD_ACTION_ITEM_NODE_NAME,
  CARD_ACTIONS_NODE_NAME,
  CARD_DIVIDER_NODE_NAME,
  CARD_FIELD_NODE_NAME,
  CARD_FIELDS_NODE_NAME,
  CARD_IMAGE_NODE_NAME,
  CARD_LINK_NODE_NAME,
  CARD_TEXT_NODE_NAME,
} from './nodes';

type JSONLike = Record<string, unknown>;

/**
 * Replace the current top-level block with an atom card block (divider,
 * link, image, fields, actions).
 *
 * Maily's `+` button inserts a transient `paragraph` with a `/` to
 * trigger the slash menu. When the user then picks a block, we delete
 * the entire parent block — not just the `/` text range — and insert
 * the target node in its place, so no empty paragraph gets left behind.
 * The same code path runs cleanly when the slash menu is triggered
 * inside an existing `cardText`.
 */
function replaceBlockWithAtom(editor: Editor, _range: Range, node: JSONLike) {
  const { $from } = editor.state.selection;
  const parentStart = $from.before($from.depth);
  const parentEnd = $from.after($from.depth);

  editor.chain().focus().insertContentAt({ from: parentStart, to: parentEnd }, node).run();
}

/**
 * Convert the current text-like block (paragraph or cardText) into a
 * `cardText` with the given style. Uses `setNode` so the inline content
 * (already-typed text + variables) carries over.
 */
function setCardTextStyle(editor: Editor, range: Range, style: 'plain' | 'bold' | 'muted') {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .setNode(CARD_TEXT_NODE_NAME, { style })
    .run();
}

const headingBlock: BlockItem = {
  title: 'Heading',
  description: 'Section title, bold text.',
  searchTerms: ['heading', 'title', 'h1'],
  icon: <RiHeading className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => setCardTextStyle(editor, range, 'bold'),
};

const textBlock: BlockItem = {
  title: 'Text',
  description: 'Plain body text.',
  searchTerms: ['text', 'paragraph', 'p'],
  icon: <RiTextSnippet className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => setCardTextStyle(editor, range, 'plain'),
};

const dividerBlock: BlockItem = {
  title: 'Divider',
  description: 'Horizontal line.',
  searchTerms: ['divider', 'separator', 'hr', 'line'],
  icon: <RiSeparator className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => replaceBlockWithAtom(editor, range, { type: CARD_DIVIDER_NODE_NAME }),
};

const imageBlock: BlockItem = {
  title: 'Image',
  description: 'Embed a static or dynamic image.',
  searchTerms: ['image', 'photo', 'picture', 'img'],
  icon: <RiImageLine className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) =>
    replaceBlockWithAtom(editor, range, { type: CARD_IMAGE_NODE_NAME, attrs: { url: '', alt: '' } }),
};

const linkBlock: BlockItem = {
  title: 'Link',
  description: 'Standalone styled link.',
  searchTerms: ['link', 'url', 'href', 'a'],
  icon: <RiLink className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) =>
    replaceBlockWithAtom(editor, range, { type: CARD_LINK_NODE_NAME, attrs: { label: '', url: '' } }),
};

const fieldsBlock: BlockItem = {
  title: 'Fields',
  description: 'Two-column fact list.',
  searchTerms: ['fields', 'grid', 'list', 'facts'],
  icon: <RiListCheck className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) =>
    replaceBlockWithAtom(editor, range, {
      type: CARD_FIELDS_NODE_NAME,
      content: [{ type: CARD_FIELD_NODE_NAME, attrs: { label: '', value: '' } }],
    }),
};

const actionsBlock: BlockItem = {
  title: 'Buttons',
  description: 'Row of interactive link buttons.',
  searchTerms: ['buttons', 'actions', 'cta'],
  icon: <RiSendPlane2Line className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) =>
    replaceBlockWithAtom(editor, range, {
      type: CARD_ACTIONS_NODE_NAME,
      content: [
        {
          type: CARD_ACTION_ITEM_NODE_NAME,
          attrs: { kind: 'link-button', label: '', url: '', style: 'default' },
        },
      ],
    }),
};

export const createChatBlocks = (): BlockGroupItem[] => [
  {
    title: 'Content',
    commands: [headingBlock, textBlock, imageBlock, dividerBlock],
  },
  {
    title: 'Layout',
    commands: [linkBlock, fieldsBlock],
  },
  {
    title: 'Interactive',
    commands: [actionsBlock],
  },
];
