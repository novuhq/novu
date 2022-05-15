import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import { slackConfig } from '../provider-credentials';

export const directProviders: IProviderConfig[] = [
  {
    id: 'slack',
    displayName: 'Slack',
    channel: ChannelTypeEnum.DIRECT,
    credentials: slackConfig,
    docReference: 'https://api.slack.com/docs',
    logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
  },
  {
    id: 'discord',
    displayName: 'Discord',
    channel: ChannelTypeEnum.DIRECT,
    credentials: {} as IConfigCredentials[],
    docReference: 'https://discord.com/developers/docs/intro',
    logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
    comingSoon: true,
  },
];
