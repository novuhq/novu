import { BaseModule } from '../base-module';
import { updatePreference } from './helpers';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';

export class Preferences extends BaseModule {
  async fetch(): Promise<Preference[]> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('preferences.fetch.pending');

        const response = await this._inboxService.fetchPreferences();
        const modifiedResponse: Preference[] = response.map((el) => new Preference(el));

        this._emitter.emit('preferences.fetch.success', { args: undefined, result: modifiedResponse });

        return modifiedResponse;
      } catch (error) {
        this._emitter.emit('preferences.fetch.error', { args: undefined, error });
        throw error;
      }
    });
  }

  async update(args: UpdatePreferencesArgs): Promise<Preference> {
    return this.callWithSession(async () =>
      updatePreference({ emitter: this._emitter, apiService: this._inboxService, args })
    );
  }
}
