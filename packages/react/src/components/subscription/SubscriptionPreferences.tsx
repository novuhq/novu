import type { SubscriptionPreferencesWrapperProps } from '@novu/js/ui';
import React from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type SubscriptionPreferencesProps = Partial<SubscriptionPreferencesWrapperProps>;

export const SubscriptionPreferences = React.memo(
  ({
    topicKey,
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
        if (!topicKey) {
          return;
        }

        return novuUI.mountComponent({
          name: 'SubscriptionPreferences',
          element,
          props: {
            topicKey,
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
      [
        novuUI,
        topicKey,
        identifier,
        preferences,
        onClick,
        onDeleteError,
        onDeleteSuccess,
        onCreateError,
        onCreateSuccess,
      ]
    );

    return <Mounter mount={mount} />;
  }
);
