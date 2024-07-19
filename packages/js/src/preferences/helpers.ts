import { InboxService } from '../api';

import type { NovuEventEmitter } from '../event-emitter';
import type { TODO } from '../types';
import { PreferenceLevel } from '../types';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';

export const mapPreference = (apiPreference: {
  template?: TODO;
  preferences: {
    enabled: boolean;
    channels: {
      email?: boolean;
      sms?: boolean;
      in_app?: boolean;
      chat?: boolean;
      push?: boolean;
    };
  };
}): Preference => {
  const { template: workflow, preferences } = apiPreference;
  const hasWorkflow = workflow !== undefined;
  const level = hasWorkflow ? PreferenceLevel.TEMPLATE : PreferenceLevel.GLOBAL;

  return new Preference({
    level,
    enabled: preferences.enabled,
    channels: preferences.channels,
    workflow: hasWorkflow
      ? {
          id: workflow?._id,
          name: workflow?.name,
          critical: workflow?.critical,
          identifier: workflow?.identifier,
          data: workflow?.data,
        }
      : undefined,
  });
};

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
    emitter.emit('preferences.update.pending', { args });

    let response;
    if (workflowId) {
      response = await apiService.updateWorkflowPreferences({ workflowId, channelPreferences });
    } else {
      response = await apiService.updateGlobalPreferences(channelPreferences);
    }

    const preference = new Preference(mapPreference(response));
    emitter.emit('preferences.update.success', { args, result: preference });

    return preference;
  } catch (error) {
    emitter.emit('preferences.update.error', { args, error });
    throw error;
  }
};
