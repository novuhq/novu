import { SetMetadata } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExternalApiAccessible = () =>
  SetMetadata('external_api_accessible', true);
