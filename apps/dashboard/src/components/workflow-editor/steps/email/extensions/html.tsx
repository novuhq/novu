import { BlockItem } from '@maily-to/core/blocks';
import { CodeXmlIcon } from 'lucide-react';

export const htmlCodeBlock: BlockItem = {
  title: 'Custom HTML code',
  description: 'Render components from HTML',
  searchTerms: ['html', 'code', 'custom'],
  icon: <CodeXmlIcon className="mly-h-4 mly-w-4" />,
  preview: () => (
    <div>
      <figure className="mly-relative mly-aspect-[2.5] mly-w-full mly-overflow-hidden mly-rounded-md mly-border mly-border-gray-200">
        <img
          src="/images/email-editor/html-block-thumb.png"
          alt="New Dashboard Preview"
          className="mly-absolute mly-w-full"
          style={{
            transform: 'scale(2)',
            transformOrigin: '0 0',
          }}
        />
      </figure>
      <p className="mly-mt-2 mly-px-0.5 mly-text-gray-500">Render components from HTML</p>
    </div>
  ),
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      // @ts-expect-error: This is a valid command
      .setHtmlCodeBlock({ language: 'html' })
      .run();
  },
};
