import * as MixpanelInstance from 'mixpanel';
import Analytics from 'analytics-node';

import { Mixpanel } from 'mixpanel';
import { UserEntity } from '@novu/dal';
import { OrganizationEntity } from '@novu/dal';

export class AnalyticsService {
  private mixpanel: Mixpanel;

  private segment: Analytics;

  async initialize() {
    if (process.env.MIXPANEL_TOKEN) {
      this.mixpanel = MixpanelInstance.init(process.env.MIXPANEL_TOKEN);
    }

    if (process.env.SEGMENT_TOKEN) {
      this.segment = new Analytics(process.env.SEGMENT_TOKEN);
    }
  }

  upsertGroup(organizationId: string, organization: OrganizationEntity, userId: string) {
    if (this.analyticsEnabled) {
      this.mixpanel.groups.set('_organization', organizationId, {
        $name: organization.name,
      });
    }

    if (this.segmentEnabled) {
      this.segment.group({
        userId: userId,
        groupId: organizationId,
        traits: {
          name: organization.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createdAt: (organization as any).createdAt,
        },
      });
    }
  }

  alias(distinctId: string, userId: string) {
    if (this.analyticsEnabled) {
      this.mixpanel.alias(distinctId, userId);
    }

    if (this.segmentEnabled) {
      this.segment.alias({
        previousId: distinctId,
        userId: userId,
      });
    }
  }

  upsertUser(user: UserEntity, distinctId: string) {
    if (this.segmentEnabled) {
      this.segment.identify({
        userId: distinctId,
        traits: {
          firstName: user.firstName,
          lastName: user.lastName,
          name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim(),
          email: user.email,
          avatar: user.profilePicture,
          createdAt: user.createdAt,
        },
      });
    }
    if (this.analyticsEnabled) {
      this.mixpanel.people.set(distinctId, {
        $first_name: user.firstName || '',
        $last_name: user.lastName || '',
        $created: user.createdAt || new Date(),
        $email: user.email,
        userId: user._id,
      });
    }
  }

  setValue(userId: string, propertyName: string, value: string | number) {
    if (this.segmentEnabled) {
      this.segment.identify({
        userId: userId,
        traits: {
          [propertyName]: value,
        },
      });
    }

    if (this.analyticsEnabled) {
      this.mixpanel.people.set(userId, propertyName, value || '');
    }
  }

  track(name: string, userId: string, data: Record<string, unknown> = {}) {
    if (this.segmentEnabled) {
      this.segment.track({
        userId: userId,
        event: name,
        properties: data,
      });
    }

    if (this.analyticsEnabled) {
      try {
        this.mixpanel.track(name, {
          distinct_id: userId,
          ...data,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  private get analyticsEnabled() {
    return process.env.NODE_ENV !== 'test' && this.mixpanel;
  }

  private get segmentEnabled() {
    return process.env.NODE_ENV !== 'test' && this.segment;
  }
}
