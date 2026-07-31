import type { BlockGroupItem } from '@novu/maily-core/blocks';
import type { StepResponseDto } from '@novu/shared';
import type { useTelemetry } from '@/hooks/use-telemetry';
import { type BlockConfig, createEditorBlocks } from './maily-config';

/**
 * Block set for the Chat step block editor (M2). A chat message is a single
 * card whose ordered children are the top-level blocks. Button count and other
 * platform limits are validated server-side, so nothing is capped here.
 */
const CHAT_BLOCK_CONFIG: BlockConfig = {
  highlights: {
    enabled: true,
    title: 'Highlights',
    blocks: [
      { type: 'text', enabled: true, order: 0 },
      { type: 'image', enabled: true, order: 1 },
      { type: 'cardButton', enabled: true, order: 2 },
      { type: 'divider', enabled: true, order: 3 },
      { type: 'digest', enabled: true, order: 4 },
    ],
  },
  allBlocks: {
    enabled: true,
    title: 'All blocks',
    blocks: [
      { type: 'text', enabled: true, order: 0 },
      { type: 'bulletList', enabled: true, order: 1 },
      { type: 'orderedList', enabled: true, order: 2 },
      { type: 'blockquote', enabled: true, order: 3 },
      { type: 'cardButton', enabled: true, order: 4 },
      { type: 'divider', enabled: true, order: 5 },
      { type: 'image', enabled: true, order: 6 },
      { type: 'repeat', enabled: true, order: 7 },
      { type: 'hardBreak', enabled: true, order: 8 },
      { type: 'digest', enabled: true, order: 9 },
    ],
    sortAlphabetically: true,
  },
};

export const createChatEditorBlocks = (props: {
  track: ReturnType<typeof useTelemetry>;
  digestStepBeforeCurrent?: StepResponseDto;
}): BlockGroupItem[] =>
  createEditorBlocks({
    track: props.track,
    digestStepBeforeCurrent: props.digestStepBeforeCurrent,
    blockConfig: CHAT_BLOCK_CONFIG,
  });
