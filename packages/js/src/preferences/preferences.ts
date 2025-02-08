import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { BaseModule } from '../base-module';
import { Preference } from './preference';
import type { ListPreferencesArgs } from './types';
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

  async list(args: ListPreferencesArgs = {}): Result<Preference[]> {
    return this.callWithSession(async () => {
      try {
        let data = this.#useCache ? this.cache.getAll(args) : undefined;
        this._emitter.emit('preferences.list.pending', { args, data });

        if (!data) {
          const response = await this._inboxService.fetchPreferences(args.tags);
          data = response.map(
            (el) =>
              new Preference(el, {
                emitterInstance: this._emitter,
                inboxServiceInstance: this._inboxService,
                cache: this.cache,
                useCache: this.#useCache,
              })
          );

          if (this.#useCache) {
            this.cache.set(args, data);
            data = this.cache.getAll(args);
          }
        }

        this._emitter.emit('preferences.list.resolved', { args, data });

        return { data };
      } catch (error) {
        this._emitter.emit('preferences.list.resolved', { args, error });
        throw error;
      }
    });
  }
}
