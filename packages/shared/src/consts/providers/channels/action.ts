import { ActionIntegrationTypeEnum, ActionProviderIdEnum, CredentialsKeyEnum } from '../../../types';
import { IActionProviderConfig } from '../provider.interface';

export const actionProviders: IActionProviderConfig[] = [
  {
    id: ActionProviderIdEnum.HttpRequest,
    displayName: 'HTTP Request',
    category: ActionIntegrationTypeEnum.HTTP,
    description: 'Send or receive data by calling an external API',
    credentials: [],
    logoFileName: { light: 'http.svg', dark: 'http.svg' },
    docReference: 'https://docs.novu.co/steps/http-request',
    iconName: 'ri-global-line',
    color: 'information',
    badgeLabel: 'API',
  },
];
