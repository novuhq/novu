import { SetMetadata } from '@nestjs/common';

import { REQUIRES_ENVIRONMENT_KEY } from '../guards/api-key-v2-environment.guard';

export function RequiresEnvironment(requiresEnvironment = true) {
  return SetMetadata(REQUIRES_ENVIRONMENT_KEY, requiresEnvironment);
}
