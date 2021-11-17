import { Notifire } from '@notifire/core';
import { NotifireOptions } from '../interfaces';
import { NOTIFIRE_OPTIONS } from '../helpers/constants';
import { NotifireService } from '../services';

export function createNotifireProviders(options: NotifireOptions) {
  return [
    {
      provide: NotifireService,
      useFactory: async () => {
        const notifire = new Notifire();
        if (options.providers) {
          for (const provider of options.providers) {
            await notifire.registerProvider(provider);
          }
        }

        if (options.templates) {
          for (const template of options.templates) {
            await notifire.registerTemplate(template);
          }
        }

        return notifire;
      },
    },
    {
      provide: NOTIFIRE_OPTIONS,
      useValue: options,
    },
  ];
}
