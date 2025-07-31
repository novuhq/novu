import { Provider } from '@nestjs/common';
// biome-ignore lint/style/noRestrictedImports: <explanation>
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
