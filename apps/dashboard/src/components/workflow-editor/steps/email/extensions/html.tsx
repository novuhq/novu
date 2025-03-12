import { BlockItem } from '@maily-to/core/blocks';
import { CodeXmlIcon } from 'lucide-react';

export const htmlCodeBlock: BlockItem = {
  title: 'Custom HTML code',
  description: 'Render components from HTML',
  searchTerms: ['html', 'code', 'custom'],
  icon: <CodeXmlIcon className="mly-h-4 mly-w-4" />,
  preview: '/images/email-editor/html-block-preview.png',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).setHtmlCodeBlock({ language: 'html' }).run();
  },
};
