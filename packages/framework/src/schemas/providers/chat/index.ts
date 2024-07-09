import { ChatProviderIdEnum } from '@novu/shared';
import { genericProviderSchemas } from '../generic';
import { ChatProvidersSchemas } from '../types';
import { slackProviderSchemas } from './slack';

export const chatProviderSchemas: ChatProvidersSchemas = {
  [ChatProviderIdEnum.Slack]: slackProviderSchemas,
  [ChatProviderIdEnum.Discord]: genericProviderSchemas,
  [ChatProviderIdEnum.GetStream]: genericProviderSchemas,
  [ChatProviderIdEnum.GrafanaOnCall]: genericProviderSchemas,
  [ChatProviderIdEnum.Mattermost]: genericProviderSchemas,
  [ChatProviderIdEnum.MsTeams]: genericProviderSchemas,
  [ChatProviderIdEnum.RocketChat]: genericProviderSchemas,
  [ChatProviderIdEnum.Ryver]: genericProviderSchemas,
  [ChatProviderIdEnum.WhatsAppBusiness]: genericProviderSchemas,
  [ChatProviderIdEnum.Zulip]: genericProviderSchemas,
};
