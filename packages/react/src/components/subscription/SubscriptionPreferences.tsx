import type { SubscriptionPreferencesWrapperProps } from '@novu/js/ui';
import React, { useMemo } from 'react';
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

    return <Mounter name="SubscriptionPreferences" props={mountProps} />;
  }
);

SubscriptionPreferences.displayName = 'SubscriptionPreferences';
