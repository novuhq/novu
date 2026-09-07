import { CodeXmlIcon } from 'lucide-react';
import { BlockItem } from './types';

export const htmlCodeBlock: BlockItem = {
  title: 'Custom HTML',
  description: 'Insert a custom HTML block',
  searchTerms: ['html', 'code', 'custom'],
  icon: <CodeXmlIcon className="mly-h-4 mly-w-4" />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).setHtmlCodeBlock({ language: 'html' }).run();
  },
};
