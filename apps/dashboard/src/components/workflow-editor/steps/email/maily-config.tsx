import { createFooters } from '@/components/workflow-editor/steps/email/blocks/footers';
import { createHeaders } from '@/components/workflow-editor/steps/email/blocks/headers';
import { createHtmlCodeBlock } from '@/components/workflow-editor/steps/email/extensions/html';
import { useTelemetry } from '@/hooks/use-telemetry';
import {
  BlockGroupItem,
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
  orderedList,
  repeat,
  section,
  spacer,
  text,
} from '@maily-to/core/blocks';

export const DEFAULT_EDITOR_CONFIG = {
  hasMenuBar: false,
  wrapClassName: 'min-h-0 max-h-full flex flex-col w-full h-full overflow-y-auto',
  bodyClassName: '!bg-transparent flex flex-col basis-full !border-none !mt-0 [&>div]:basis-full [&_.tiptap]:h-full',
};

export const createDefaultEditorBlocks = (props: {
  isCustomEmailBlocksEnabled: boolean;
  track: ReturnType<typeof useTelemetry>;
}): BlockGroupItem[] => {
  const { isCustomEmailBlocksEnabled, track } = props;
  const blocks: BlockGroupItem[] = [];

  if (isCustomEmailBlocksEnabled) {
    blocks.push({
      title: 'Highlights',
      commands: [createHtmlCodeBlock({ track }), createHeaders({ track }), createFooters({ track })],
    });
  }

  blocks.push({
    title: 'All blocks',
    commands: [
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
      orderedList,
      repeat,
      section,
      spacer,
      text,
    ],
  });

  return blocks;
};
