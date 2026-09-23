import type {
  CustomDataType,
  IPreferenceChannels,
  PreferenceLevelEnum,
  Schedule,
  SeverityLevelEnum,
} from '@novu/shared';
import type { RulesLogic } from 'json-logic-js';

export interface InboxPreferenceWorkflow {
  id: string;
  identifier: string;
  name: string;
  critical: boolean;
  severity: SeverityLevelEnum;
  tags?: string[];
  data?: CustomDataType;
}

export interface InboxPreference {
  level: PreferenceLevelEnum;
  enabled: boolean;
  channels: IPreferenceChannels;
  subscriptionId?: string;
  workflow?: InboxPreferenceWorkflow;
  schedule?: Schedule;
  condition?: RulesLogic;
}

export type WebhookInboxPreferenceWorkflow = Omit<InboxPreferenceWorkflow, 'identifier'> & {
  identifier?: string;
};

export type WebhookInboxPreference = Omit<InboxPreference, 'workflow'> & {
  workflow?: WebhookInboxPreferenceWorkflow;
};
