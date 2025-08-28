import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { PreferencesCache } from '../cache/preferences-cache';
import { NovuEventEmitter } from '../event-emitter';
import { Result, WorkflowCriticalityEnum } from '../types';
import { bulkUpdatePreference, updatePreference } from './helpers';
import { Preference } from './preference';
import type { BasePreferenceArgs, InstancePreferenceArgs, ListPreferencesArgs, UpdatePreferenceArgs } from './types';

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
          const response = await this._inboxService.fetchPreferences({
            tags: args.tags,
            severity: args.severity,
            criticality: args.criticality ?? WorkflowCriticalityEnum.NON_CRITICAL,
          });
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

  async update(args: BasePreferenceArgs): Result<Preference>;
  async update(args: InstancePreferenceArgs): Result<Preference>;
  async update(args: UpdatePreferenceArgs): Result<Preference> {
    return this.callWithSession(() =>
      updatePreference({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }

  async bulkUpdate(args: Array<BasePreferenceArgs>): Result<Preference[]>;
  async bulkUpdate(args: Array<InstancePreferenceArgs>): Result<Preference[]>;
  async bulkUpdate(args: Array<UpdatePreferenceArgs>): Result<Preference[]> {
    return this.callWithSession(() =>
      bulkUpdatePreference({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }
}
