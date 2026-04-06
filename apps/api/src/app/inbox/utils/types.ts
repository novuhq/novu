import type {
  CustomDataType,
  IPreferenceChannels,
  PreferenceLevelEnum,
  Schedule,
  SeverityLevelEnum,
  TagsFilter,
} from '@novu/shared';
import type { RulesLogic } from 'json-logic-js';

export type NotificationFilter = {
  tags?: TagsFilter;
  read?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  seen?: boolean;
  data?: string;
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
  createdGte?: number;
  createdLte?: number;
};

export type InboxPreference = {
  level: PreferenceLevelEnum;
  subscriptionId?: string;
  enabled: boolean;
  condition?: RulesLogic;
  channels: IPreferenceChannels;
  workflow?: {
    id: string;
    identifier: string;
    name: string;
    critical: boolean;
    tags?: string[];
    data?: CustomDataType;
    severity: SeverityLevelEnum;
  };
  schedule?: Schedule;
};
