import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';
import { NovuEventEmitter, PreferenceEvents } from '../event-emitter';
import { PreferenceLevel } from '../types';
import { Preference } from '../preferences/preference';

// these events should update the preferences in the cache
const updateEvents: PreferenceEvents[] = ['preference.update.pending', 'preference.update.resolved'];

const DEFAULT_KEY = 'default';

export class PreferencesCache {
  #emitter: NovuEventEmitter;
  #cache: Cache<Preference[]>;

  constructor() {
    this.#emitter = NovuEventEmitter.getInstance();
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

  set(data: Preference[]): void {
    this.#cache.set(DEFAULT_KEY, data);
  }

  getAll(): Preference[] | undefined {
    return this.#cache.get(DEFAULT_KEY);
  }

  clearAll(): void {
    this.#cache.clear();
  }
}
