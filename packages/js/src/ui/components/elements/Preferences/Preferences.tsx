import { createEffect, createMemo, Show } from 'solid-js';
import { AppearanceCallback } from 'src/ui/types';
import { Preference } from '../../../../preferences/preference';
import { ChannelPreference, PreferenceLevel } from '../../../../types';
import { usePreferences } from '../../../api';
import { setDynamicLocalization } from '../../../config';
import { useInboxContext, useNovu } from '../../../context';
import { useStyle } from '../../../helpers';
import { DefaultPreferences } from './DefaultPreferences';
import { GroupedPreferences } from './GroupedPreferences';
import { PreferencesListSkeleton } from './PreferencesListSkeleton';
import { PreferencesRow } from './PreferencesRow';

/* This is also going to be exported as a separate component. Keep it pure. */
export const Preferences = () => {
  const novu = useNovu();
  const style = useStyle();
  const { preferencesFilter, preferenceGroups } = useInboxContext();

  const { preferences, loading } = usePreferences({
    tags: preferencesFilter()?.tags,
    severity: preferencesFilter()?.severity,
    criticality: preferencesFilter()?.criticality,
  });

  const allPreferences = createMemo(() => {
    const globalPreference = preferences()?.find((preference) => preference.level === PreferenceLevel.GLOBAL)!;
    const workflowPreferences = preferences()?.filter((preference) => preference.level === PreferenceLevel.TEMPLATE);

    return { globalPreference, workflowPreferences };
  });

  createEffect(() => {
    // Register the names as localizable
    setDynamicLocalization((prev) => ({
      ...prev,
      ...allPreferences().workflowPreferences?.reduce<Record<string, string>>((acc, preference) => {
        acc[preference.workflow!.identifier] = preference.workflow!.name;

        return acc;
      }, {}),
    }));
  });

  const updatePreference = (preference?: Preference) => async (channels: ChannelPreference) => {
    await preference?.update({
      channels,
    });
  };

  const bulkUpdatePreferences = (preferences: Preference[]) => async (channels: ChannelPreference) => {
    await novu.preferences.bulkUpdate(
      preferences.map((el) => {
        const oldChannels = Object.keys(el.channels);
        const channelsToUpdate = Object.keys(channels)
          .filter((channel) => oldChannels.includes(channel))
          .reduce((acc, channel) => {
            acc[channel as keyof ChannelPreference] = channels[channel as keyof ChannelPreference];

            return acc;
          }, {} as ChannelPreference);

        return { preference: el, channels: channelsToUpdate };
      })
    );
  };

  const groupedPreferences = createMemo(() => {
    const workflowPreferences = allPreferences().workflowPreferences ?? [];

    return (
      preferenceGroups()?.map((group) => {
        const { filter } = group;
        if (typeof filter === 'function') {
          const preferences = filter({ preferences: workflowPreferences });

          return { name: group.name, preferences };
        }

        if (typeof filter === 'object') {
          return {
            name: group.name,
            preferences: workflowPreferences.filter((preference) => {
              const workflowId = preference.workflow?.id || preference.workflow?.identifier;

              return (
                filter.workflowIds?.includes(workflowId ?? '') ||
                filter.tags?.some((tag) => preference.workflow?.tags?.includes(tag)) ||
                (Array.isArray(filter.severity) &&
                  filter.severity.some((severity) => preference.workflow?.severity === severity)) ||
                (!Array.isArray(filter.severity) && filter.severity === preference.workflow?.severity)
              );
            }),
          };
        }

        return {
          name: group.name,
          preferences: [],
        };
      }) ?? []
    );
  });

  return (
    <div
      class={style({
        key: 'preferencesContainer',
        className:
          'nt-px-3 nt-py-4 nt-flex nt-flex-col nt-gap-1 nt-overflow-y-auto nt-h-full nt-pr-0 [scrollbar-gutter:stable]',
        context: { preferences: preferences(), groups: groupedPreferences() } satisfies Parameters<
          AppearanceCallback['preferencesContainer']
        >[0],
      })}
    >
      <PreferencesRow
        iconKey="cogs"
        preference={allPreferences().globalPreference}
        onChange={() => updatePreference(allPreferences().globalPreference)}
      />
      <Show
        when={groupedPreferences().length > 0}
        fallback={
          <Show
            when={allPreferences().workflowPreferences?.length}
            fallback={<PreferencesListSkeleton loading={loading()} />}
          >
            <DefaultPreferences
              workflowPreferences={allPreferences().workflowPreferences}
              loading={loading()}
              updatePreference={updatePreference}
            />
          </Show>
        }
      >
        <GroupedPreferences
          groups={groupedPreferences()}
          loading={loading()}
          updatePreference={updatePreference}
          bulkUpdatePreferences={bulkUpdatePreferences}
        />
      </Show>
    </div>
  );
};
