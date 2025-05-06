import { ChatProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';
import { slackProviderSchemas } from './slack.schema';

export const chatProviderSchemas = {
  discord: genericProviderSchemas,
  getstream: genericProviderSchemas,
  'grafana-on-call': genericProviderSchemas,
  mattermost: genericProviderSchemas,
  msteams: genericProviderSchemas,
  'rocket-chat': genericProviderSchemas,
  ryver: genericProviderSchemas,
  slack: slackProviderSchemas,
  'whatsapp-business': genericProviderSchemas,
  zulip: genericProviderSchemas,
} as const satisfies Record<ChatProviderIdEnum, { output: JsonSchema }>;
