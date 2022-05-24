import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import { slackConfig } from '../provider-credentials';
import { DirectIntegrationId } from '../provider.enum';

export const directProviders: IProviderConfig[] = [
  {
    id: DirectIntegrationId.Slack,
    displayName: 'Slack',
    channel: ChannelTypeEnum.DIRECT,
    credentials: slackConfig,
    docReference: 'https://api.slack.com/docs',
    logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
  },
  {
    id: DirectIntegrationId.Discord,
    displayName: 'Discord',
    channel: ChannelTypeEnum.DIRECT,
    credentials: {} as IConfigCredentials[],
    docReference: 'https://discord.com/developers/docs/intro',
    logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
    comingSoon: true,
  },
];
