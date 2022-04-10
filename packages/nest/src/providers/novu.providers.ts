import { Novu } from '@novu/stateless';
import { NovuOptions } from '../interfaces';
import { NOVU_OPTIONS } from '../helpers/constants';
import { NovuService } from '../services';

export function createNovuProviders(options: NovuOptions) {
  return [
    {
      provide: NovuService,
      useFactory: async () => {
        const novu = new Novu();
        if (options.providers) {
          for (const provider of options.providers) {
            await novu.registerProvider(provider);
          }
        }

        if (options.templates) {
          for (const template of options.templates) {
            await novu.registerTemplate(template);
          }
        }

        return novu;
      },
    },
    {
      provide: NOVU_OPTIONS,
      useValue: options,
    },
  ];
}
