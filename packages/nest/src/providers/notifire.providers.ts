import { NotifireOptions } from '../interfaces';
import { NOTIFIRE_OPTIONS } from '../helpers/constants';

export function createNotifireProviders(options: NotifireOptions) {
  return [
    {
      provide: NOTIFIRE_OPTIONS,
      useValue: options,
    },
  ];
}
