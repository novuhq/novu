import { Analytics } from '@segment/analytics-node';
import { Logger } from '@nestjs/common';
import * as Mixpanel from 'mixpanel';

import { IOrganizationEntity } from '@novu/shared';

interface IUser {
  _id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
}

const LOG_CONTEXT = 'AnalyticsService';

export class AnalyticsService {
  private segment: Analytics;
  private mixpanel: Mixpanel.Mixpanel;
  constructor(private segmentToken?: string | null, private batchSize = 100) {}

  async initialize() {
    if (this.segmentToken) {
      this.segment = new Analytics({
        writeKey: this.segmentToken,
        maxEventsInBatch: this.batchSize,
      });
    }

    if (process.env.MIXPANEL_TOKEN) {
      this.mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
    }
  }

  upsertGroup(
    organizationId: string,
    organization: IOrganizationEntity,
    user: IUser
  ) {
    if (this.segmentEnabled) {
      const traits: Record<string, string | string[]> = {
        _organization: organizationId,
        id: organizationId,
        name: organization.name,
        createdAt: organization.createdAt,
        domain: organization.domain || user.email?.split('@')[1],
      };

      if (organization.productUseCases) {
        const productUseCases: string[] = [];

        for (const key in organization.productUseCases) {
          if (organization.productUseCases[key]) {
            productUseCases.push(key);
          }
        }
        traits.productUseCases = productUseCases;
      }

      this.segment.group({
        userId: user._id as any,
        groupId: organizationId,
        traits: traits,
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

  upsertUser(user: IUser, distinctId: string) {
    if (this.segmentEnabled) {
      const githubToken = (user as any).tokens?.find(
        (token) => token.provider === 'github'
      );

      this.segment.identify({
        userId: distinctId,
        traits: {
          firstName: user.firstName,
          lastName: user.lastName,
          name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim(),
          email: user.email,
          avatar: user.profilePicture,
          createdAt: user.createdAt,
          // For segment auto mapping
          created: user.createdAt,
          githubProfile: githubToken?.username,
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
      Logger.log(
        'Tracking event: ' + name,
        {
          name,
          data,
          source: 'segment',
        },
        LOG_CONTEXT
      );

      try {
        this.segment.track({
          userId: userId,
          event: name,
          properties: data,
        });
      } catch (error: any) {
        Logger.error(
          {
            eventName: name,
            usedId: userId,
            message: error.message,
          },
          'There has been an error when tracking',
          LOG_CONTEXT
        );
      }
    }
  }

  mixpanelTrack(
    name: string,
    userId: string,
    data: Record<string, unknown> = {}
  ) {
    if (this.mixpanelEnabled) {
      Logger.log(
        'Tracking event: ' + name,
        {
          name,
          data,
          source: 'mixpanel',
        },
        LOG_CONTEXT
      );

      try {
        this.mixpanel.track(name, {
          distinct_id: userId,
          ...data,
        });
      } catch (error: any) {
        Logger.error(
          {
            eventName: name,
            usedId: userId,
            message: error?.message,
          },
          'There has been an error when tracking mixpanel',
          LOG_CONTEXT
        );
      }
    }
  }

  private get segmentEnabled() {
    return process.env.NODE_ENV !== 'test' && this.segment;
  }

  private get mixpanelEnabled() {
    return process.env.NODE_ENV !== 'test' && this.mixpanel;
  }
}
