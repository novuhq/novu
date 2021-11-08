import { NOTIFIRE } from '../helpers';
import { NotifireService } from '../services';

export const instanceFactory = {
  provide: NOTIFIRE,
  useFactory: async notifireService => {
    await notifireService.registerProviders();
    await notifireService.registerTemplates();
    return await notifireService.get();
  },
  inject: [NotifireService],
};
