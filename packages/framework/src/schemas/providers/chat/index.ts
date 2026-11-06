import { ChatProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { photonImessageProviderSchemas } from './photon-imessage.schema';
import { slackProviderSchemas } from './slack.schema';

export const chatProviderSchemas = {
  'chat-webhook': genericProviderSchemas,
  discord: genericProviderSchemas,
  'google-chat': genericProviderSchemas,
  getstream: genericProviderSchemas,
  'grafana-on-call': genericProviderSchemas,
  line: genericProviderSchemas,
  mattermost: genericProviderSchemas,
  msteams: genericProviderSchemas,
  'novu-slack': genericProviderSchemas,
  'novu-web-chat': genericProviderSchemas,
  'photon-imessage': photonImessageProviderSchemas,
  'rocket-chat': genericProviderSchemas,
  ryver: genericProviderSchemas,
  sendblue: genericProviderSchemas,
  slack: slackProviderSchemas,
  'webex-messaging': genericProviderSchemas,
  'whatsapp-business': genericProviderSchemas,
  zulip: genericProviderSchemas,
  telegram: genericProviderSchemas,
  wechat: genericProviderSchemas,
} as const satisfies Record<ChatProviderIdEnum, { output: JsonSchema }>;
