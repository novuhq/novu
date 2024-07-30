import { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';

export const updatePreference = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: UpdatePreferencesArgs;
}): Promise<Preference> => {
  const { workflowId, channelPreferences } = args;
  try {
    emitter.emit('preferences.update.pending', {
      args,
      optimistic: args.preference
        ? new Preference({
            ...args.preference,
            channels: {
              ...args.preference.channels,
              ...channelPreferences,
            },
          })
        : undefined,
    });

    let response;
    if (workflowId) {
      response = await apiService.updateWorkflowPreferences({ workflowId, channelPreferences });
    } else {
      response = await apiService.updateGlobalPreferences(channelPreferences);
    }

    const preference = new Preference(response);
    emitter.emit('preferences.update.success', { args, result: preference });

    return preference;
  } catch (error) {
    emitter.emit('preferences.update.error', { args, error });
    throw error;
  }
};
