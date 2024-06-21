import { BaseModule } from '../base-module';
import { PreferenceLevel } from '../types';
import { mapPreference, updatePreference } from './helpers';
import { Preference } from './preference';
import type { FetchPreferencesArgs, UpdatePreferencesArgs } from './types';

export class Preferences extends BaseModule {
  async fetch({ level = PreferenceLevel.TEMPLATE }: FetchPreferencesArgs = {}): Promise<Preference[]> {
    return this.callWithSession(async () => {
      const args = { level };
      try {
        this._emitter.emit('preferences.fetch.pending', { args });

        const response = await this._apiService.getPreferences({ level });
        const modifiedResponse: Preference[] = response.map((el) => new Preference(mapPreference(el)));

        this._emitter.emit('preferences.fetch.success', { args, result: modifiedResponse });

        return modifiedResponse;
      } catch (error) {
        this._emitter.emit('preferences.fetch.error', { args, error });
        throw error;
      }
    });
  }

  async update(args: UpdatePreferencesArgs): Promise<Preference> {
    return this.callWithSession(async () =>
      updatePreference({ emitter: this._emitter, apiService: this._apiService, args })
    );
  }
}
