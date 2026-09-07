import { applyDecorators, SetMetadata } from '@nestjs/common';

export const EXCLUDE_FROM_IDEMPOTENCY = 'exclude_from_idempotency';

export function ExcludeFromIdempotency() {
  return applyDecorators(SetMetadata(EXCLUDE_FROM_IDEMPOTENCY, true));
}
