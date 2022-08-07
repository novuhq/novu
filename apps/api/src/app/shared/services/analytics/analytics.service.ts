import * as MixpanelInstance from 'mixpanel';

import { Mixpanel } from 'mixpanel';
import { UserEntity } from '@novu/dal';

export class AnalyticsService {
  private mixpanel: Mixpanel;

  async initialize() {
    if (process.env.MIXPANEL_TOKEN) {
      this.mixpanel = MixpanelInstance.init(process.env.MIXPANEL_TOKEN);
    }
  }

  alias(distinctId: string, userId: string) {
    if (!this.analyticsEnabled) return;

    this.mixpanel.alias(distinctId, userId);
  }

  upsertUser(user: UserEntity, distinctId: string) {
    if (!this.analyticsEnabled) return;

    this.mixpanel.people.set(distinctId, {
      $first_name: user.firstName || '',
      $last_name: user.lastName || '',
      $created: user.createdAt || new Date(),
      $email: user.email,
      userId: user._id,
    });
  }

  setValue(userId: string, propertyName: string, value: string | number) {
    if (!this.analyticsEnabled) return;

    this.mixpanel.people.set(userId, propertyName, value || '');
  }

  track(name: string, userId: string, data: Record<string, unknown> = {}) {
    if (!this.analyticsEnabled) return;

    try {
      this.mixpanel.track(name, {
        distinct_id: userId,
        ...data,
      });
    } catch (e) {
      console.error(e);
    }
  }

  private get analyticsEnabled() {
    return process.env.NODE_ENV !== 'test' && this.mixpanel;
  }
}
