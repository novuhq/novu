import { NovuEventEmitter, PreferenceScheduleEvents } from '../event-emitter';
import { Schedule } from '../preferences';
import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';

// these events should update the schedule in the cache
const updateEvents: PreferenceScheduleEvents[] = [
  'preference.schedule.update.pending',
  'preference.schedule.update.resolved',
];

const getCacheKey = (): string => {
  return 'schedule';
};

export class ScheduleCache {
  #emitter: NovuEventEmitter;
  #cache: Cache<Schedule>;

  constructor({ emitterInstance }: { emitterInstance: NovuEventEmitter }) {
    this.#emitter = emitterInstance;
    for (const event of updateEvents) {
      this.#emitter.on(event, this.handleScheduleEvent);
    }
    this.#cache = new InMemoryCache();
  }

  private updateScheduleInCache = (key: string, data: Schedule): boolean => {
    const schedule = this.#cache.get(key);
    if (!schedule) {
      return false;
    }

    this.#cache.set(key, data);

    return true;
  };

  private handleScheduleEvent = ({ data }: { data?: Schedule }): void => {
    if (!data) {
      return;
    }

    const uniqueFilterKeys = new Set<string>();
    const keys = this.#cache.keys();
    for (const key of keys) {
      const hasUpdatedSchedule = this.updateScheduleInCache(key, data);

      const updatedSchedule = this.#cache.get(key);
      if (!hasUpdatedSchedule || !updatedSchedule) {
        continue;
      }

      uniqueFilterKeys.add(key);
    }

    for (const key of uniqueFilterKeys) {
      this.#emitter.emit('preference.schedule.get.updated', {
        data: this.#cache.get(key)!,
      });
    }
  };

  has(): boolean {
    return this.#cache.get(getCacheKey()) !== undefined;
  }

  set(data: Schedule): void {
    this.#cache.set(getCacheKey(), data);
  }

  getAll(): Schedule | undefined {
    if (this.has()) {
      return this.#cache.get(getCacheKey());
    }
  }

  clearAll(): void {
    this.#cache.clear();
  }
}
