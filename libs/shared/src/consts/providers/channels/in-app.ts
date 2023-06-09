import { novuInAppConfig } from '../credentials';

import { InAppProviderIdEnum } from '../provider.enum';
import { IProviderConfig } from '../provider.interface';

import { ChannelTypeEnum } from '../../../types';

export const inAppProviders: IProviderConfig[] = [
  {
    id: InAppProviderIdEnum.Novu,
    displayName: 'Notification Center',
    channel: ChannelTypeEnum.IN_APP,
    credentials: novuInAppConfig,
    docReference: 'https://docs.novu.co/notification-center/getting-started',
    logoFileName: { light: 'novu.png', dark: 'novu.png' },
  },
];
