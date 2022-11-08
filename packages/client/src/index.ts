import { IPreferenceChannels } from '@novu/shared';

export interface IUnseenCountQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
}

export interface IStoreQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
  read?: boolean;
}

export interface ITabCountQuery {
  feedIdentifier?: string | string[];
  seen?: boolean;
  read?: boolean;
}

export interface IUserPreferenceSettings {
  template: { _id: string; name: string; critical: boolean };
  preference: { enabled: boolean; channels: IPreferenceChannels };
}

export { ApiService } from './api/api.service';
