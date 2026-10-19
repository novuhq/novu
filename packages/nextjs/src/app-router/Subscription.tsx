'use client';

import { Subscription as RSubscription, type SubscriptionProps } from '@novu/react';

export function Subscription(props: SubscriptionProps) {
  return <RSubscription {...props} />;
}
