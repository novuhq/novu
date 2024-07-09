import { genericProviderSchemas } from '../generic';
import { slackProviderSchemas } from './slack';

export const chatProviderSchemas = {
  slack: slackProviderSchemas,
  discord: genericProviderSchemas,
  getstream: genericProviderSchemas,
  grafanaOnCall: genericProviderSchemas,
  mattermost: genericProviderSchemas,
  msTeams: genericProviderSchemas,
  rocketChat: genericProviderSchemas,
  ryver: genericProviderSchemas,
  whatsappBusiness: genericProviderSchemas,
  zulip: genericProviderSchemas,
};
