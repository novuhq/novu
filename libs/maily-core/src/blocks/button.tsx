import { ArrowUpRightSquare, MousePointer } from 'lucide-react';
import type { BlockItem } from './types';
import '@/editor/nodes/button/button';
import '@/editor/extensions/link-card';

export const button: BlockItem = {
  title: 'Button',
  description: 'Add a call to action button to email.',
  searchTerms: ['link', 'button', 'cta'],
  icon: <MousePointer className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).setButton().run();
  },
};

export const linkCard: BlockItem = {
  title: 'Link Card',
  description: 'Add a link card to email.',
  searchTerms: ['link', 'button', 'image'],
  icon: <ArrowUpRightSquare className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).setLinkCard().run();
  },
  render: (editor) => {
    return editor.extensionManager.extensions.findIndex((ext) => ext.name === 'linkCard') === -1 ? null : true;
  },
};
