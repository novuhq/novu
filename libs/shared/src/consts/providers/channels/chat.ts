import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { ChannelTypeEnum } from '../../../entities/message-template';
import { slackConfig, whatsappConfig } from '../credentials';
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
    id: ChatProviderIdEnum.Whatsapp,
    displayName: 'Whatsapp',
    channel: ChannelTypeEnum.CHAT,
    credentials: whatsappConfig,
    docReference: 'https://discord.com/developers/docs/intro',
    logoFileName: { light: 'whatsapp.svg', dark: 'whatsapp.svg' },
  },
];
