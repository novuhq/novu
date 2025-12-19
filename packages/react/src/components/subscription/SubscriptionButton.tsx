import type { SubscriptionButtonWrapperProps } from '@novu/js/ui';
import React from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type SubscriptionButtonProps = Partial<SubscriptionButtonWrapperProps>;

export const SubscriptionButton = React.memo(
  ({
    topicKey,
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
        if (!topicKey) {
          return;
        }

        return novuUI.mountComponent({
          name: 'SubscriptionButton',
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
