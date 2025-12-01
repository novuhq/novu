import { TopicSubscription } from '@novu/js';
import { SubscriptionProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { useRenderer } from '../../context/RendererContext';
import { Mounter } from '../Mounter';

export type PreferencesRenderer = (subscription?: TopicSubscription, loading?: boolean) => React.ReactNode;

export type DefaultSubscriptionProps = {
  renderPreferences?: PreferencesRenderer;
} & Pick<SubscriptionProps, 'open' | 'placement' | 'placementOffset' | 'topic' | 'identifier' | 'preferences'>;

export const DefaultSubscription = (props: DefaultSubscriptionProps) => {
  const { topic, identifier, preferences, open, placement, placementOffset, renderPreferences } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Subscription',
        props: {
          topic,
          identifier,
          preferences,
          open,
          placementOffset,
          placement,
          renderPreferences: renderPreferences
            ? (el, subscription, loading) => mountElement(el, renderPreferences(subscription, loading))
            : undefined,
        },
        element,
      });
    },
    [topic, identifier, preferences, open, placementOffset, placement, renderPreferences, novuUI, mountElement]
  );

  return <Mounter mount={mount} />;
};
