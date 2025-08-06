import { BlockItem } from '@maily-to/core/blocks';
import { CodeXmlIcon } from 'lucide-react';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const createHtmlCodeBlock = (props: { track: ReturnType<typeof useTelemetry> }): BlockItem => {
  const { track } = props;

  return {
    title: 'Custom HTML code',
    description: 'Add a block of HTML',
    searchTerms: ['html', 'code', 'custom'],
    icon: <CodeXmlIcon className="mly-h-4 mly-w-4" />,
    preview: '/images/email-editor/html-block-preview.webp',
    command: ({ editor, range }) => {
      track(TelemetryEvent.EMAIL_BLOCK_ADDED, {
        type: 'custom_html',
      });

      editor.chain().focus().deleteRange(range).setHtmlCodeBlock({ language: 'html' }).run();
    },
  };
};
