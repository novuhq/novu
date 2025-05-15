import { Provider } from '@nestjs/common';
// eslint-disable-next-line no-restricted-imports
import { Svix } from 'svix';

export type SvixClient = Svix | null;

export const SvixProviderService: Provider<SvixClient> = {
  provide: 'SVIX_CLIENT',
  useFactory: (): SvixClient => {
    const apiKey = process.env.SVIX_API_KEY;

    if (!apiKey) {
      return null;
    }

    return new Svix(apiKey);
  },
};
