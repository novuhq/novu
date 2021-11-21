import { SetMetadata } from '@nestjs/common';

export const ExternalApiAccessible = () => SetMetadata('external_api_accessible', true);
