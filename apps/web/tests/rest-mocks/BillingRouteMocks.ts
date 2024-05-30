import { Page } from '@playwright/test';
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';

interface GetSubscriptionResponsePayload {
  trialEnd: Date;
  trialStart: Date;
  hasPaymentMethod: boolean;
  status: string;
}

const SUBSCRIPTION_ROUTE = '**/v1/billing/subscription';

export class BillingRouteMocks {
  public static async mockSubscriptionRestCall(page, mockPayload: GetSubscriptionResponsePayload) {
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
      trialStart: null,
      trialEnd: null,
      hasPaymentMethod: false,
      status,
    });
  }
  static async mockActiveSubscription(page: Page) {
    return await BillingRouteMocks.mockSubscriptionRestCall(page, {
      trialStart: null,
      trialEnd: null,
      hasPaymentMethod: true,
      status: 'active',
    });
  }
  public static async mockSubscriptionTrial(page: Page, daysFromStart: number) {
    await BillingRouteMocks.mockSubscriptionRestCall(page, {
      trialStart: subDays(startOfDay(new Date()), daysFromStart),
      trialEnd: addDays(endOfDay(new Date()), 30 - daysFromStart),
      hasPaymentMethod: false,
      status: 'trialing',
    });
  }
}
