import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import { slackConfig } from '../credentials';
import { ChatProviderIdEnum } from '../provider.enum';

export const chatProviders: IProviderConfig[] = [
  {
    id: ChatProviderIdEnum.Slack,
    displayName: 'Slack',
    channel: ChannelTypeEnum.CHAT,
    credentials: slackConfig,
    docReference: 'https://api.slack.com/docs',
    logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
  },
  {
    id: ChatProviderIdEnum.Discord,
    displayName: 'Discord',
    channel: ChannelTypeEnum.CHAT,
    credentials: [] as IConfigCredentials[],
    docReference: 'https://discord.com/developers/docs/intro',
    logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
  },
  {
    id: ChatProviderIdEnum.MsTeams,
    displayName: 'MSTeams',
    channel: ChannelTypeEnum.CHAT,
    credentials: [] as IConfigCredentials[],
    docReference:
      'https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
    logoFileName: { light: 'msteams.svg', dark: 'msteams.svg' },
  },
];
