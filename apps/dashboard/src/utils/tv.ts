import { createTV } from 'tailwind-variants';

import { twMergeConfig } from '@/utils/ui';

export type { ClassValue, VariantProps } from 'tailwind-variants';

export const tv = createTV({
  twMergeConfig,
});
