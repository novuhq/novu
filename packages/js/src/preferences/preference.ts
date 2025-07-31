import { InboxService } from '../api';
import { PreferencesCache } from '../cache/preferences-cache';
import { NovuEventEmitter } from '../event-emitter';
import { ChannelPreference, PreferenceLevel, Prettify, Result, Workflow } from '../types';
import { updatePreference } from './helpers';
import { UpdatePreferenceArgs } from './types';

type PreferenceLike = Pick<Preference, 'level' | 'enabled' | 'channels' | 'workflow'>;

export class Preference {
  #emitter: NovuEventEmitter;
  #apiService: InboxService;
  #cache: PreferencesCache;
  #useCache: boolean;

  readonly level: PreferenceLevel;
  readonly enabled: boolean;
  readonly channels: ChannelPreference;
  readonly workflow?: Workflow;

  constructor(
    preference: PreferenceLike,
    {
      emitterInstance,
      inboxServiceInstance,
      cache,
      useCache,
    }: {
      emitterInstance: NovuEventEmitter;
      inboxServiceInstance: InboxService;
      cache: PreferencesCache;
      useCache: boolean;
    }
  ) {
    this.#emitter = emitterInstance;
    this.#apiService = inboxServiceInstance;
    this.#cache = cache;
    this.#useCache = useCache;
    this.level = preference.level;
    this.enabled = preference.enabled;
    this.channels = preference.channels;
    this.workflow = preference.workflow;
  }

  update({
    channels,
    channelPreferences,
  }: Prettify<
    Pick<UpdatePreferenceArgs, 'channels'> & {
      /** @deprecated Use channels instead */
      channelPreferences?: ChannelPreference;
    }
  >): Result<Preference> {
    return updatePreference({
      emitter: this.#emitter,
      apiService: this.#apiService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: {
        workflowId: this.workflow?.id,
        channels: channels || channelPreferences,
        preference: this,
      },
    });
  }
}
