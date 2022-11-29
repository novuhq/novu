import { UserEntity } from '@novu/dal';
import { OrganizationEntity } from '@novu/dal';
import Analytics from 'analytics-node';

// Due to problematic analytics-node types, we need to use require
// eslint-disable-next-line @typescript-eslint/naming-convention
const AnalyticsClass = require('analytics-node');

export class AnalyticsService {
  private segment: Analytics;

  async initialize() {
    if (process.env.SEGMENT_TOKEN) {
      this.segment = new AnalyticsClass(process.env.SEGMENT_TOKEN);
    }
  }

  upsertGroup(organizationId: string, organization: OrganizationEntity, userId: string) {
    if (this.segmentEnabled) {
      this.segment.group({
        userId: userId,
        groupId: organizationId,
        traits: {
          _organization: organizationId,
          id: organizationId,
          name: organization.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createdAt: (organization as any).createdAt,
        },
      });
    }
  }

  alias(distinctId: string, userId: string) {
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
  }

  track(name: string, userId: string, data: Record<string, unknown> = {}) {
    if (this.segmentEnabled) {
      this.segment.track({
        userId: userId,
        event: name,
        properties: data,
      });
    }
  }

  private get segmentEnabled() {
    return process.env.NODE_ENV !== 'test' && this.segment;
  }
}
