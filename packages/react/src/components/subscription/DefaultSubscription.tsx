import { TopicSubscription } from '@novu/js';
import { SubscriptionProps } from '@novu/js/ui';
import { useMemo } from 'react';
import { useOutletRenderer } from '../../hooks/internal/useOutletRenderer';
import { Mounter } from '../Mounter';

export type PreferencesRenderer = (subscription?: TopicSubscription, loading?: boolean) => React.ReactNode;

export type DefaultSubscriptionProps = {
  renderPreferences?: PreferencesRenderer;
} & Pick<SubscriptionProps, 'open' | 'placement' | 'placementOffset' | 'topicKey' | 'identifier' | 'preferences'>;

export const DefaultSubscription = (props: DefaultSubscriptionProps) => {
  const { topicKey, identifier, preferences, open, placement, placementOffset, renderPreferences } = props;
  const renderPreferencesOutlet =
    useOutletRenderer<[TopicSubscription | undefined, boolean | undefined]>(renderPreferences);

  const mountProps = useMemo(
    () => ({
      topicKey,
      identifier,
      preferences,
      open,
      placementOffset,
      placement,
      renderPreferences: renderPreferencesOutlet,
    }),
    [topicKey, identifier, preferences, open, placementOffset, placement, renderPreferencesOutlet]
  );

  return <Mounter name="Subscription" props={mountProps} />;
};
