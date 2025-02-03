import {
  blockquote,
  bulletList,
  button,
  columns,
  divider,
  forLoop,
  hardBreak,
  heading1,
  heading2,
  heading3,
  image,
  orderedList,
  section,
  spacer,
  text,
} from '@maily-to/core/blocks';

export const DEFAULT_EDITOR_CONFIG = {
  hasMenuBar: false,
  wrapClassName: 'min-h-0 max-h-full flex flex-col w-full h-full overflow-y-auto',
  bodyClassName: '!bg-transparent flex flex-col basis-full !border-none !mt-0 [&>div]:basis-full [&_.tiptap]:h-full',
};

export const DEFAULT_EDITOR_BLOCKS = [
  text,
  heading1,
  heading2,
  heading3,
  bulletList,
  orderedList,
  image,
  section,
  columns,
  divider,
  spacer,
  button,
  hardBreak,
  blockquote,
  forLoop,
];
