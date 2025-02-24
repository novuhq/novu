import { ApiServiceLevelEnum, GetSubscriptionDto } from '@novu/shared';
import { Page } from '@playwright/test';
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';

const SUBSCRIPTION_ROUTE = '**/v1/billing/subscription';

const subscriptionMock: GetSubscriptionDto = {
  status: 'active',
  apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
  isActive: true,
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date().toISOString(),
  billingInterval: 'month',
  events: {
    current: 0,
    included: 1000000,
  },
  trial: {
    isActive: false,
    start: null,
    end: null,
    daysTotal: 0,
  },
};

export class BillingRouteMocks {
  public static async mockSubscriptionRestCall(page, mockPayload: GetSubscriptionDto) {
    await page.route(SUBSCRIPTION_ROUTE, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockPayload,
        }),
      });
    });
  }
  static async mockSubscriptionWithStatus(page: Page, status: string) {
    return await BillingRouteMocks.mockSubscriptionRestCall(page, {
      ...subscriptionMock,
      status,
    });
  }

  static async mockActiveSubscription(page: Page) {
    return await BillingRouteMocks.mockSubscriptionRestCall(page, {
      ...subscriptionMock,
      status: 'active',
    });
  }

  static async mockSubscriptionWithApiServiceLevel(page: Page, apiServiceLevel: ApiServiceLevelEnum) {
    return await BillingRouteMocks.mockSubscriptionRestCall(page, {
      ...subscriptionMock,
      apiServiceLevel,
    });
  }

  public static async mockSubscriptionTrial(page: Page, daysFromStart: number) {
    await BillingRouteMocks.mockSubscriptionRestCall(page, {
      ...subscriptionMock,
      trial: {
        ...subscriptionMock.trial,
        isActive: true,
        start: subDays(startOfDay(new Date()), daysFromStart).toISOString(),
        end: addDays(endOfDay(new Date()), 30 - daysFromStart).toISOString(),
      },
      status: 'trialing',
    });
  }
}
