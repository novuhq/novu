import { MousePointerClick } from 'lucide-react';
import type { BlockItem } from './types';
import '@/editor/nodes/card-button/card-button';

export const cardButton: BlockItem = {
  title: 'Button',
  description: 'Add a link or action button to the card.',
  searchTerms: ['link', 'button', 'cta', 'action', 'card'],
  icon: <MousePointerClick className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).setCardButton().run();
  },
};
