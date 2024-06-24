import type { ApiService } from '@novu/client';

import { NovuEventEmitter } from '../event-emitter';
import { ChannelPreference, ChannelType, PreferenceLevel, Workflow } from '../types';
import { ApiServiceSingleton } from '../utils/api-service-singleton';
import { updatePreference } from './helpers';

type PreferenceLike = Pick<Preference, 'level' | 'enabled' | 'channels' | 'workflow'>;

export class Preference {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;

  readonly level: PreferenceLevel;
  readonly enabled: boolean;
  readonly channels: ChannelPreference;
  readonly workflow?: Workflow;

  constructor(preference: PreferenceLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();

    this.level = preference.level;
    this.enabled = preference.enabled;
    this.channels = preference.channels;
    this.workflow = preference.workflow;
  }

  updatePreference({ enabled, channel }: { enabled: boolean; channel: ChannelType }): Promise<Preference> {
    return updatePreference({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: { workflowId: this.workflow?.id, enabled, channel },
    });
  }
}
