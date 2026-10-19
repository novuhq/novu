import { Index, Show } from 'solid-js';

import { ChannelPreference, Preference } from '../../../../types';
import { GroupedPreferencesRow } from './GroupedPreferencesRow';
import { PreferencesListSkeleton } from './PreferencesListSkeleton';

export const GroupedPreferences = (props: {
  groups: Array<{ name: string; preferences: Preference[] }>;
  loading?: boolean;
  updatePreference: (preference: Preference) => (channels: ChannelPreference) => void;
  bulkUpdatePreferences: (preferences: Preference[]) => (channels: ChannelPreference) => void;
}) => {
  const groups = () => props.groups;

  return (
    <Show when={props.groups.length && !props.loading} fallback={<PreferencesListSkeleton loading={props.loading} />}>
      <Index each={groups()}>
        {(group) => {
          return (
            <GroupedPreferencesRow
              group={group()}
              bulkUpdatePreferences={props.bulkUpdatePreferences}
              updatePreference={props.updatePreference}
            />
          );
        }}
      </Index>
    </Show>
  );
};
