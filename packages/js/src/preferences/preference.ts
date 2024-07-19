import { InboxService } from 'src/api';
import { InboxServiceSingleton } from 'src/utils/inbox-service-singleton';

import { NovuEventEmitter } from '../event-emitter';
import { ChannelPreference, PreferenceLevel, Workflow } from '../types';
import { updatePreference } from './helpers';

type PreferenceLike = Pick<Preference, 'level' | 'enabled' | 'channels' | 'workflow'>;

export class Preference {
  #emitter: NovuEventEmitter;
  #apiService: InboxService;

  readonly level: PreferenceLevel;
  readonly enabled: boolean;
  readonly channels: ChannelPreference;
  readonly workflow?: Workflow;

  constructor(preference: PreferenceLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = InboxServiceSingleton.getInstance();

    this.level = preference.level;
    this.enabled = preference.enabled;
    this.channels = preference.channels;
    this.workflow = preference.workflow;
  }

  updatePreference({ channelPreferences }: { channelPreferences: ChannelPreference }): Promise<Preference> {
    return updatePreference({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: { workflowId: this.workflow?.id, channelPreferences },
    });
  }
}
