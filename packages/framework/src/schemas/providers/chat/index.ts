import { ChatProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { slackProviderSchemas } from './slack.schema';

export const chatProviderSchemas = {
  'chat-webhook': genericProviderSchemas,
  discord: genericProviderSchemas,
  getstream: genericProviderSchemas,
  'grafana-on-call': genericProviderSchemas,
  line: genericProviderSchemas,
  mattermost: genericProviderSchemas,
  msteams: genericProviderSchemas,
  'novu-slack': genericProviderSchemas,
  'rocket-chat': genericProviderSchemas,
  ryver: genericProviderSchemas,
  sendblue: genericProviderSchemas,
  slack: slackProviderSchemas,
  'webex-messaging': genericProviderSchemas,
  'whatsapp-business': genericProviderSchemas,
  zulip: genericProviderSchemas,
  telegram: genericProviderSchemas,
} as const satisfies Record<ChatProviderIdEnum, { output: JsonSchema }>;
