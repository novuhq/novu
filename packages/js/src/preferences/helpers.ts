import { InboxService } from '../api';
import { PreferencesCache } from '../cache/preferences-cache';
import { ScheduleCache } from '../cache/schedule-cache';
import type { NovuEventEmitter } from '../event-emitter';
import type { ChannelPreference, Result } from '../types';
import { ChannelType, PreferenceLevel } from '../types';
import { NovuError } from '../utils/errors';
import { Preference } from './preference';
import { Schedule } from './schedule';
import type { UpdatePreferenceArgs, UpdateScheduleArgs } from './types';

type UpdatePreferenceParams = {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: PreferencesCache;
  scheduleCache: ScheduleCache;
  useCache: boolean;
  args: UpdatePreferenceArgs;
};

type BulkUpdatePreferenceParams = {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: PreferencesCache;
  scheduleCache: ScheduleCache;
  useCache: boolean;
  args: Array<UpdatePreferenceArgs>;
};

type UpdateScheduleParams = {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: ScheduleCache;
  useCache: boolean;
  args: UpdateScheduleArgs;
};

export const updatePreference = async ({
  emitter,
  apiService,
  cache,
  scheduleCache,
  useCache,
  args,
}: UpdatePreferenceParams): Result<Preference> => {
  const { channels } = args;
  const workflowId = 'workflowId' in args ? args.workflowId : args.preference.workflow?.id;

  try {
    emitter.emit('preference.update.pending', {
      args,
      data:
        'preference' in args
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
                scheduleCache,
                useCache,
              }
            )
          : undefined,
    });

    let response;
    if (workflowId) {
      response = await apiService.updateWorkflowPreferences({ workflowId, channels });
    } else {
      optimisticUpdateWorkflowPreferences({ emitter, apiService, cache, scheduleCache, useCache, args });
      response = await apiService.updateGlobalPreferences(channels);
    }

    const preference = new Preference(response, {
      emitterInstance: emitter,
      inboxServiceInstance: apiService,
      cache,
      scheduleCache,
      useCache,
    });
    emitter.emit('preference.update.resolved', { args, data: preference });

    return { data: preference };
  } catch (error) {
    emitter.emit('preference.update.resolved', { args, error });

    return { error: new NovuError('Failed to update preference', error) };
  }
};

export const bulkUpdatePreference = async ({
  emitter,
  apiService,
  cache,
  scheduleCache,
  useCache,
  args,
}: BulkUpdatePreferenceParams): Result<Preference[]> => {
  const globalPreference = args.find((arg) => 'preference' in arg && arg.preference.level === PreferenceLevel.GLOBAL);
  if (globalPreference) {
    return { error: new NovuError('Global preference is not supported in bulk update', '') };
  }

  try {
    const optimisticallyUpdatedPreferences = args
      .map((arg) =>
        'preference' in arg
          ? new Preference(
              {
                ...arg.preference,
                channels: {
                  ...arg.preference.channels,
                  ...arg.channels,
                },
              },
              {
                emitterInstance: emitter,
                inboxServiceInstance: apiService,
                cache,
                scheduleCache,
                useCache,
              }
            )
          : undefined
      )
      .filter((el) => el !== undefined);

    emitter.emit('preferences.bulk_update.pending', {
      args,
      data: optimisticallyUpdatedPreferences,
    });

    const preferencesToUpdate = args.map((arg) => ({
      workflowId:
        'workflowId' in arg
          ? arg.workflowId
          : (arg.preference.workflow?.id ?? arg.preference.workflow?.identifier ?? ''),
      ...arg.channels,
    }));
    const response = await apiService.bulkUpdatePreferences(preferencesToUpdate);

    const preferences = response.map(
      (el) =>
        new Preference(el, {
          emitterInstance: emitter,
          inboxServiceInstance: apiService,
          cache,
          scheduleCache,
          useCache,
        })
    );
    emitter.emit('preferences.bulk_update.resolved', { args, data: preferences });

    return { data: preferences };
  } catch (error) {
    emitter.emit('preferences.bulk_update.resolved', { args, error });

    return { error: new NovuError('Failed to bulk update preferences', error) };
  }
};

const optimisticUpdateWorkflowPreferences = ({
  emitter,
  apiService,
  cache,
  scheduleCache,
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
      const updatedPreference =
        'preference' in args
          ? new Preference(mergedPreference, {
              emitterInstance: emitter,
              inboxServiceInstance: apiService,
              cache,
              scheduleCache,
              useCache,
            })
          : undefined;

      if (updatedPreference) {
        emitter.emit('preference.update.pending', {
          args: {
            workflowId: el.workflow?.id ?? '',
            channels: updatedPreference.channels,
          },
          data: updatedPreference,
        });
      }
    }
  });
};

export const updateSchedule = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: UpdateScheduleParams): Result<Schedule> => {
  try {
    const { isEnabled, weeklySchedule } = args;
    const optimisticallyUpdatedSchedule = new Schedule(
      {
        isEnabled,
        weeklySchedule,
      },
      {
        emitterInstance: emitter,
        inboxServiceInstance: apiService,
        cache,
        useCache,
      }
    );
    emitter.emit('preference.schedule.update.pending', { args, data: optimisticallyUpdatedSchedule });

    // Call the API to update global preferences
    const response = await apiService.updateGlobalPreferences({
      schedule: {
        isEnabled,
        weeklySchedule,
      },
    });

    // Create new Schedule instance with updated data
    const updatedSchedule = new Schedule(
      {
        isEnabled: response.schedule?.isEnabled,
        weeklySchedule: response.schedule?.weeklySchedule,
      },
      {
        emitterInstance: emitter,
        inboxServiceInstance: apiService,
        cache,
        useCache,
      }
    );

    emitter.emit('preference.schedule.update.resolved', {
      args,
      data: updatedSchedule,
    });

    return { data: updatedSchedule };
  } catch (error) {
    emitter.emit('preference.schedule.update.resolved', { args, error });
    return { error: new NovuError('Failed to update preference', error) };
  }
};
