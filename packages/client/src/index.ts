import {
  IPreferenceChannels,
  NotificationTemplateCustomData,
} from '@novu/shared';

export interface IUnseenCountQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
  limit?: number;
}

export interface IUnreadCountQuery {
  feedIdentifier?: string | string[];
  read?: boolean;
  limit?: number;
}

export interface IStoreQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
  read?: boolean;
  limit?: number;
  payload?: Record<string, unknown>;
}

export interface ITabCountQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
  read?: boolean;
  limit?: number;
}

export interface IUserPreferenceSettings {
  template: {
    _id: string;
    name: string;
    critical: boolean;
    tags?: string[];
    data?: NotificationTemplateCustomData;
  };
  preference: PreferenceSettingsType;
}

export interface IUserGlobalPreferenceSettings {
  preference: PreferenceSettingsType;
}

export type PreferenceSettingsType = {
  enabled: boolean;
  channels: IPreferenceChannels;
};
export { ApiService } from './api/api.service';
