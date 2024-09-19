import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';
import { NovuEventEmitter, PreferenceEvents } from '../event-emitter';
import { PreferenceLevel } from '../types';
import { Preference } from '../preferences/preference';
import { ListPreferencesArgs } from '../preferences/types';

// these events should update the preferences in the cache
const updateEvents: PreferenceEvents[] = ['preference.update.pending', 'preference.update.resolved'];

const excludeEmpty = ({ tags }: ListPreferencesArgs) =>
  Object.entries({ tags }).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      return acc;
    }
    // @ts-expect-error
    acc[key] = value;

    return acc;
  }, {});

const getCacheKey = ({ tags }: ListPreferencesArgs): string => {
  return JSON.stringify(excludeEmpty({ tags }));
};

export class PreferencesCache {
  #emitter: NovuEventEmitter;
  #cache: Cache<Preference[]>;

  constructor({ emitterInstance }: { emitterInstance: NovuEventEmitter }) {
    this.#emitter = emitterInstance;
    updateEvents.forEach((event) => {
      this.#emitter.on(event, this.handlePreferenceEvent);
    });
    this.#cache = new InMemoryCache();
  }

  private updatePreference = (key: string, data: Preference): boolean => {
    const preferences = this.#cache.get(key);
    if (!preferences) {
      return false;
    }

    const index = preferences.findIndex(
      (el) =>
        el.workflow?.id === data.workflow?.id || (el.level === data.level && data.level === PreferenceLevel.GLOBAL)
    );
    if (index === -1) {
      return false;
    }

    const updatedPreferences = [...preferences];
    updatedPreferences[index] = data;

    this.#cache.set(key, updatedPreferences);

    return true;
  };

  private handlePreferenceEvent = ({ data }: { data?: Preference }): void => {
    if (!data) {
      return;
    }

    this.#cache.keys().forEach((key) => {
      const hasUpdatedPreference = this.updatePreference(key, data);

      const updatedPreference = this.#cache.get(key);
      if (!hasUpdatedPreference || !updatedPreference) {
        return;
      }

      this.#emitter.emit('preferences.list.updated', {
        data: updatedPreference,
      });
    });
  };

  has(args: ListPreferencesArgs): boolean {
    return this.#cache.get(getCacheKey(args)) !== undefined;
  }

  set(args: ListPreferencesArgs, data: Preference[]): void {
    this.#cache.set(getCacheKey(args), data);
  }

  getAll(args: ListPreferencesArgs): Preference[] | undefined {
    if (this.has(args)) {
      return this.#cache.get(getCacheKey(args));
    }
  }

  clearAll(): void {
    this.#cache.clear();
  }
}
