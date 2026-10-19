import { applyDecorators, SetMetadata } from '@nestjs/common';

export const KEYLESS_ACCESSIBLE = 'keyless_accessible';

export function KeylessAccessible() {
  return applyDecorators(SetMetadata(KEYLESS_ACCESSIBLE, true));
}
