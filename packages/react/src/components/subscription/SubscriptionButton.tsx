import type { SubscriptionButtonWrapperProps } from '@novu/js/ui';
import React, { useMemo } from 'react';
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
    const mountProps = useMemo(
      () =>
        topicKey
          ? {
              topicKey,
              identifier,
              preferences,
              onClick,
              onDeleteError,
              onDeleteSuccess,
              onCreateError,
              onCreateSuccess,
            }
          : undefined,
      [topicKey, identifier, preferences, onClick, onDeleteError, onDeleteSuccess, onCreateError, onCreateSuccess]
    );

    if (!mountProps) {
      return null;
    }

    return <Mounter name="SubscriptionButton" props={mountProps} />;
  }
);

SubscriptionButton.displayName = 'SubscriptionButton';
