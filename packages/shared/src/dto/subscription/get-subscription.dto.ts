import { ApiServiceLevelEnum } from '../../types';

export type GetSubscriptionDto = {
  /**
   * The API service level of the subscription.
   */
  apiServiceLevel: ApiServiceLevelEnum;
  /**
   * Whether the subscription is active.
   */
  isActive: boolean;
  /**
   * Whether the customer has a default payment method.
   */
  hasPaymentMethod: boolean;
  /**
   * The status of the subscription.
   * @see https://stripe.com/docs/api/subscriptions/object#subscription_object-status
   * (not typed to avoid importing stripe types)
   */
  status: string;
  /**
   * The current period start date in UTC ISO 8601 format, or null if the subscription is not active.
   * @example 2021-01-01T00:00:00.000Z
   * @see https://en.wikipedia.org/wiki/ISO_8601
   */
  currentPeriodStart: string | null;
  /**
   * The current period end date in UTC ISO 8601 format, or null if the subscription is not active.
   * @example 2021-01-01T00:00:00.000Z
   * @see https://en.wikipedia.org/wiki/ISO_8601
   */
  currentPeriodEnd: string | null;
  billingInterval: 'month' | 'year' | null;
  events: {
    /**
     * The number of events already consumed.
     */
    current: number;
    /**
     * The number of included events for the subscription, or null if the subscription is not metered.
     */
    included: number | null;
  };
  trial: {
    isActive: boolean;
    /**
     * The trial start date in UTC ISO 8601 format, or null if the subscription is not in trial.
     * @example 2021-01-01T00:00:00.000Z
     * @see https://en.wikipedia.org/wiki/ISO_8601
     */
    start: string | null;
    /**
     * The trial end date in UTC ISO 8601 format, or null if the subscription is not in trial.
     * @example 2021-02-01T00:00:00.000Z
     * @see https://en.wikipedia.org/wiki/ISO_8601
     */
    end: string | null;
    /**
     * The total number of trial days.
     */
    daysTotal: number;
  };
};
