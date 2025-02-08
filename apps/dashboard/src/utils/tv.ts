import { createTV } from 'tailwind-variants';

import { twMergeConfig } from '@/utils/ui';

export type { VariantProps, ClassValue } from 'tailwind-variants';

export const tv = createTV({
  twMergeConfig,
});
