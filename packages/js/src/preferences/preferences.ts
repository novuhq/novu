import { BaseModule } from '../base-module';
import { updatePreference } from './helpers';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';
import { Result } from '../types';

export class Preferences extends BaseModule {
  async list(): Result<Preference[]> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('preferences.list.pending');

        const response = await this._inboxService.fetchPreferences();
        const modifiedResponse: Preference[] = response.map((el) => new Preference(el));

        this._emitter.emit('preferences.list.resolved', { args: undefined, data: modifiedResponse });

        return { data: modifiedResponse };
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
