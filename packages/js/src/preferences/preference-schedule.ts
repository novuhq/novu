import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { ScheduleCache } from '../cache/schedule-cache';
import { NovuEventEmitter } from '../event-emitter';
import { Result } from '../types';
import { updateSchedule } from './helpers';
import { Schedule } from './schedule';
import { UpdateScheduleArgs } from './types';

export class PreferenceSchedule extends BaseModule {
  #useCache: boolean;

  readonly cache: ScheduleCache;

  constructor({
    cache,
    useCache,
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    cache: ScheduleCache;
    useCache: boolean;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.cache = cache;
    this.#useCache = useCache;
  }

  async get(): Result<Schedule> {
    return this.callWithSession(async () => {
      try {
        let data: Schedule | undefined = this.#useCache ? this.cache.getAll() : undefined;
        this._emitter.emit('preference.schedule.get.pending', { args: undefined, data });

        if (!data) {
          const globalPreference = await this._inboxService.fetchGlobalPreferences();

          data = new Schedule(
            {
              isEnabled: globalPreference?.schedule?.isEnabled,
              weeklySchedule: globalPreference?.schedule?.weeklySchedule,
            },
            {
              emitterInstance: this._emitter,
              inboxServiceInstance: this._inboxService,
              cache: this.cache,
              useCache: this.#useCache,
            }
          );

          if (this.#useCache) {
            this.cache.set(data);
            data = this.cache.getAll();
          }
        }

        this._emitter.emit('preference.schedule.get.resolved', {
          args: undefined,
          data,
        });

        return { data };
      } catch (error) {
        this._emitter.emit('preference.schedule.get.resolved', { args: undefined, error });
        throw error;
      }
    });
  }

  async update(args: UpdateScheduleArgs): Result<Schedule> {
    return this.callWithSession(() =>
      updateSchedule({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }
}
