import type { SubscriptionButtonWrapperProps } from '@novu/js/ui';
import React from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type SubscriptionButtonProps = Partial<SubscriptionButtonWrapperProps>;

export const SubscriptionButton = React.memo(
  ({
    topic,
    identifier,
    preferences,
    onClick,
    onDeleteError,
    onDeleteSuccess,
    onCreateError,
    onCreateSuccess,
  }: SubscriptionButtonProps) => {
    const { novuUI } = useNovuUI();

    const mount = React.useCallback(
      (element: HTMLElement) => {
        if (!topic || !identifier || !preferences) {
          return;
        }

        return novuUI.mountComponent({
          name: 'SubscriptionButton',
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
