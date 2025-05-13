import { Provider } from '@nestjs/common';
import { Svix } from 'svix';

export const SvixProviderService: Provider = {
  provide: 'SVIX_CLIENT',
  useFactory: () => {
    const apiKey = process.env.SVIX_API_KEY;

    if (!apiKey) {
      return null;
    }

    return new Svix(apiKey);
  },
};
