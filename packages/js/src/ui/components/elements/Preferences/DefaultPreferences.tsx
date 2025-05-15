import { createMemo, Index, Show } from 'solid-js';

import { ChannelPreference, Preference } from '../../../../types';
import { PreferencesListSkeleton } from './PreferencesListSkeleton';
import { RouteFill as DefaultRouteFill } from '../../../icons/RouteFill';
import { PreferencesRow } from './PreferencesRow';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

export const DefaultPreferences = (props: {
  workflowPreferences?: Preference[];
  loading?: boolean;
  updatePreference: (preference: Preference) => (channels: ChannelPreference) => void;
}) => {
  const workflowPreferences = createMemo(() => props.workflowPreferences);

  const updatePreference = (workflowIdentifier?: string) => (channels: ChannelPreference) => {
    const preference = workflowPreferences()?.find((pref) => pref.workflow?.identifier === workflowIdentifier);
    if (!preference) return;

    props.updatePreference(preference)(channels);
  };

  return (
    <Show when={workflowPreferences()?.length} fallback={<PreferencesListSkeleton loading={props.loading} />}>
      <Index each={workflowPreferences()}>
        {(preference) => {
          return <PreferencesRow iconKey="routeFill" preference={preference()} onChange={updatePreference} />;
        }}
      </Index>
    </Show>
  );
};
