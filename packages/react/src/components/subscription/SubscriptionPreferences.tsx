import type { SubscriptionPreferencesWrapperProps } from '@novu/js/ui';
import React from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type SubscriptionPreferencesProps = Partial<SubscriptionPreferencesWrapperProps>;

export const SubscriptionPreferences = React.memo(
  ({
    topic,
    identifier,
    preferences,
    onClick,
    onDeleteError,
    onDeleteSuccess,
    onCreateError,
    onCreateSuccess,
  }: SubscriptionPreferencesProps) => {
    const { novuUI } = useNovuUI();

    const mount = React.useCallback(
      (element: HTMLElement) => {
        if (!topic || !identifier || !preferences) {
          return;
        }

        return novuUI.mountComponent({
          name: 'SubscriptionPreferences',
          element,
          props: {
            topic,
            identifier,
            preferences,
            onClick,
            onDeleteError,
            onDeleteSuccess,
            onCreateError,
            onCreateSuccess,
          },
        });
      },
      [novuUI, topic, identifier, preferences, onClick, onDeleteError, onDeleteSuccess, onCreateError, onCreateSuccess]
    );

    return <Mounter mount={mount} />;
  }
);
