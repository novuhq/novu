import { IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import { twilioConfig } from '../provider-credentials';

export const directProviders: IProviderConfig[] = [
  {
    id: 'slack',
    displayName: 'Slack',
    channel: ChannelTypeEnum.DIRECT,
    credentials: twilioConfig,
    docReference: 'https://api.slack.com/docs',
    logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
  },
  {
    id: 'discord',
    displayName: 'Discord',
    channel: ChannelTypeEnum.DIRECT,
    credentials: twilioConfig,
    docReference: 'https://discord.com/developers/docs/intro',
    logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
    comingSoon: true,
  },
];
