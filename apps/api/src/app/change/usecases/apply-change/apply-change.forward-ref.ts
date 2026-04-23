import { forwardRef } from '@nestjs/common';

// Resolves ApplyChange lazily so the module graph can load: apply-change → promote-change-to-environment → promote-*-translation → (no eager apply-change.usecase import).
export const applyChangeForwardRef = forwardRef(() => {
  // biome-ignore lint/style/noCommonJs: synchronous lazy resolve breaks a circular import with promote-change-to-environment
  return require('./apply-change.usecase').ApplyChange;
});
