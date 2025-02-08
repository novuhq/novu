import { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { ChannelPreference, Result } from '../types';
import { ChannelType, PreferenceLevel } from '../types';
import { Preference } from './preference';
import type { UpdatePreferencesArgs } from './types';
import { NovuError } from '../utils/errors';
import { PreferencesCache } from '../cache/preferences-cache';

type UpdatePreferenceParams = {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: PreferencesCache;
  useCache: boolean;
  args: UpdatePreferencesArgs;
};

export const updatePreference = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: UpdatePreferenceParams): Result<Preference> => {
  const { workflowId, channels } = args;
  try {
    emitter.emit('preference.update.pending', {
      args,
      data: args.preference
        ? new Preference(
            {
              ...args.preference,
              channels: {
                ...args.preference.channels,
                ...channels,
              },
            },
            {
              emitterInstance: emitter,
              inboxServiceInstance: apiService,
              cache,
              useCache,
            }
          )
        : undefined,
    });

    let response;
    if (workflowId) {
      response = await apiService.updateWorkflowPreferences({ workflowId, channels });
    } else {
      optimisticUpdateWorkflowPreferences({ emitter, apiService, cache, useCache, args });
      response = await apiService.updateGlobalPreferences(channels);
    }

    const preference = new Preference(response, {
      emitterInstance: emitter,
      inboxServiceInstance: apiService,
      cache,
      useCache,
    });
    emitter.emit('preference.update.resolved', { args, data: preference });

    return { data: preference };
  } catch (error) {
    emitter.emit('preference.update.resolved', { args, error });

    return { error: new NovuError('Failed to fetch notifications', error) };
  }
};

const optimisticUpdateWorkflowPreferences = ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: UpdatePreferenceParams): void => {
  const allPreferences = useCache ? cache?.getAll({}) : undefined;

  allPreferences?.forEach((el) => {
    if (el.level === PreferenceLevel.TEMPLATE) {
      const mergedPreference = {
        ...el,
        channels: Object.entries(el.channels).reduce((acc, [key, value]) => {
          const channelType = key as ChannelType;
          acc[channelType] = args.channels[channelType] ?? value;

          return acc;
        }, {} as ChannelPreference),
      };
      const updatedPreference = args.preference
        ? new Preference(mergedPreference, {
            emitterInstance: emitter,
            inboxServiceInstance: apiService,
            cache,
            useCache,
          })
        : undefined;

      if (updatedPreference) {
        emitter.emit('preference.update.pending', {
          args: {
            workflowId: el.workflow?.id,
            channels: updatedPreference.channels,
          },
          data: updatedPreference,
        });
      }
    }
  });
};
