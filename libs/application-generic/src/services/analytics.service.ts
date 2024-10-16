import { Analytics } from '@segment/analytics-node';
import { Logger } from '@nestjs/common';
import Mixpanel from 'mixpanel';

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
  constructor(
    private segmentToken?: string | null,
    private batchSize = 100,
  ) {}

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
    user: IUser,
  ) {
    if (!this.segmentEnabled) {
      return;
    }

    const traits: Record<string, string | string[]> = {
      _organization: organizationId,
      id: organizationId,
      name: organization.name,
      createdAt: this.convertToIsoDate(organization.createdAt),
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
      traits,
    });
  }

  alias(distinctId: string, userId: string) {
    if (!this.segmentEnabled) {
      return;
    }

    this.segment.alias({
      previousId: distinctId,
      userId,
    });
  }

  upsertUser(user: IUser, distinctId: string) {
    if (!this.segmentEnabled) {
      return;
    }

    const githubToken = (user as any).tokens?.find(
      (token) => token.provider === 'github',
    );

    this.segment.identify({
      userId: distinctId,
      traits: {
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        avatar: user.profilePicture,
        createdAt: this.convertToIsoDate(user.createdAt),
        // For segment auto mapping
        created: this.convertToIsoDate(user.createdAt),
        githubProfile: githubToken?.username,
      },
    });
  }

  setValue(userId: string, propertyName: string, value: string | number) {
    if (!this.segmentEnabled) {
      return;
    }

    this.segment.identify({
      userId,
      traits: {
        [propertyName]: value,
      },
    });
  }

  track(name: string, userId: string, data: Record<string, unknown> = {}) {
    if (!this.segmentEnabled) {
      return;
    }

    try {
      this.segment.track({
        anonymousId: userId,
        userId,
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
        LOG_CONTEXT,
      );
    }
  }

  mixpanelTrack(
    name: string,
    userId: string,
    data: Record<string, unknown> = {},
  ) {
    if (!this.mixpanelEnabled) {
      return;
    }

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
        LOG_CONTEXT,
      );
    }
  }

  private get segmentEnabled() {
    return process.env.NODE_ENV !== 'test' && this.segment;
  }

  private get mixpanelEnabled() {
    return process.env.NODE_ENV !== 'test' && this.mixpanel;
  }

  private convertToIsoDate(createdAt: string | number | null): string {
    const createdAtNumber = Number(createdAt);
    const isEpochValidNumber = !Number.isNaN(createdAtNumber);

    if (isEpochValidNumber) {
      return new Date(createdAtNumber).toISOString();
    }

    return String(createdAt);
  }
}
