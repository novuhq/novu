import type { BlockGroupItem, BlockItem } from '@novu/maily-core/blocks';
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

const headingBlock: BlockItem = {
  title: 'Heading',
  description: 'Section title, bold text.',
  searchTerms: ['heading', 'title', 'h1'],
  icon: <RiHeading className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: CARD_TEXT_NODE_NAME, attrs: { style: 'bold' } })
      .run();
  },
};

const textBlock: BlockItem = {
  title: 'Text',
  description: 'Plain body text.',
  searchTerms: ['text', 'paragraph', 'p'],
  icon: <RiTextSnippet className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: CARD_TEXT_NODE_NAME, attrs: { style: 'plain' } })
      .run();
  },
};

const dividerBlock: BlockItem = {
  title: 'Divider',
  description: 'Horizontal line.',
  searchTerms: ['divider', 'separator', 'hr', 'line'],
  icon: <RiSeparator className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).insertContent({ type: CARD_DIVIDER_NODE_NAME }).run();
  },
};

const imageBlock: BlockItem = {
  title: 'Image',
  description: 'Embed a static or dynamic image.',
  searchTerms: ['image', 'photo', 'picture', 'img'],
  icon: <RiImageLine className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: CARD_IMAGE_NODE_NAME, attrs: { url: '', alt: '' } })
      .run();
  },
};

const linkBlock: BlockItem = {
  title: 'Link',
  description: 'Standalone styled link.',
  searchTerms: ['link', 'url', 'href', 'a'],
  icon: <RiLink className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: CARD_LINK_NODE_NAME, attrs: { label: '', url: '' } })
      .run();
  },
};

const fieldsBlock: BlockItem = {
  title: 'Fields',
  description: 'Two-column fact list.',
  searchTerms: ['fields', 'grid', 'list', 'facts'],
  icon: <RiListCheck className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: CARD_FIELDS_NODE_NAME,
        content: [{ type: CARD_FIELD_NODE_NAME, attrs: { label: '', value: '' } }],
      })
      .run();
  },
};

const actionsBlock: BlockItem = {
  title: 'Buttons',
  description: 'Row of interactive link buttons.',
  searchTerms: ['buttons', 'actions', 'cta'],
  icon: <RiSendPlane2Line className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: CARD_ACTIONS_NODE_NAME,
        content: [
          {
            type: CARD_ACTION_ITEM_NODE_NAME,
            attrs: { kind: 'link-button', label: '', url: '', style: 'default' },
          },
        ],
      })
      .run();
  },
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
