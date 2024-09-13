import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { BaseModule } from '../base-module';
import { updatePreference } from './helpers';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';
import { Result } from '../types';
import { PreferencesCache } from '../cache/preferences-cache';

export class Preferences extends BaseModule {
  #useCache: boolean;

  readonly cache: PreferencesCache;

  constructor({
    useCache,
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    useCache: boolean;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.cache = new PreferencesCache({
      emitterInstance: this._emitter,
    });
    this.#useCache = useCache;
  }

  async list(): Result<Preference[]> {
    return this.callWithSession(async () => {
      try {
        let data = this.#useCache ? this.cache.getAll() : undefined;
        this._emitter.emit('preferences.list.pending', { args: undefined, data });

        if (!data) {
          const response = await this._inboxService.fetchPreferences();
          data = response.map(
            (el) =>
              new Preference(el, {
                emitterInstance: this._emitter,
                inboxServiceInstance: this._inboxService,
              })
          );

          if (this.#useCache) {
            this.cache.set(data);
          }
        }

        this._emitter.emit('preferences.list.resolved', { args: undefined, data });

        return { data };
      } catch (error) {
        this._emitter.emit('preferences.list.resolved', { args: undefined, error });
        throw error;
      }
    });
  }

  async update(args: UpdatePreferencesArgs): Result<Preference> {
    return this.callWithSession(async () =>
      updatePreference({ emitter: this._emitter, apiService: this._inboxService, args })
    );
  }
}
