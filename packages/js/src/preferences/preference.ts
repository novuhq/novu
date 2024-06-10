import { ApiService } from '@novu/client';

import { NovuEventEmitter } from '../event-emitter';
import { ChannelPreference, ChannelPreferenceOverride, ChannelType, PreferenceLevel, WorkflowInfo } from '../types';
import { ApiServiceSingleton } from '../utils/api-service-signleton';
import { updatePreference } from './helpers';

type PreferenceLike = Pick<Preference, 'level' | 'enabled' | 'channels' | 'workflow' | 'overrides'>;

export class Preference {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;

  readonly level: PreferenceLevel;
  readonly enabled: boolean;
  readonly channels: ChannelPreference;
  readonly workflow?: WorkflowInfo;
  readonly overrides?: ChannelPreferenceOverride[];

  constructor(preference: PreferenceLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();

    this.level = preference.level;
    this.enabled = preference.enabled;
    this.channels = preference.channels;
    this.workflow = preference.workflow;
    this.overrides = preference.overrides;
  }

  updatePreference({ enabled, channel }: { enabled: boolean; channel: ChannelType }): Promise<Preference> {
    return updatePreference({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: { workflowId: this.workflow?._id, enabled, channel },
    });
  }
}
