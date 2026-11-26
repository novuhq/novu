import { Logger } from '@nestjs/common';
import { IOrganizationEntity } from '@novu/shared';
import Mixpanel from 'mixpanel';

interface IUser {
  _id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
}

type Traits = Record<string, string | string[]>;

const LOG_CONTEXT = 'AnalyticsService';

/**
 * Mixpanel group key used for organization-level group analytics.
 * Matches the `_organization` trait previously sent through Segment.
 */
export const ORGANIZATION_GROUP_KEY = '_organization';

export class AnalyticsService {
  private mixpanel: Mixpanel.Mixpanel | undefined;

  constructor(private mixpanelToken: string | null | undefined = process.env.MIXPANEL_TOKEN) {}

  async initialize() {
    if (!this.mixpanelToken) {
      return;
    }

    const options: Mixpanel.InitConfig = {};

    if (process.env.MIXPANEL_HOST) {
      options.host = process.env.MIXPANEL_HOST;
    }

    this.mixpanel = Mixpanel.init(this.mixpanelToken, options);
  }

  upsertGroup(organizationId: string, organization: IOrganizationEntity, user?: Pick<IUser, '_id'>) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    const properties: Traits = {
      $name: organization.name,
      name: organization.name,
      createdAt: this.convertToIsoDate(organization.createdAt),
    };

    if (organization.productUseCases) {
      properties.productUseCases = Object.keys(organization.productUseCases).filter(
        (key) => organization.productUseCases?.[key]
      );
    }

    this.safely('upsertGroup', () => {
      mixpanel.groups.set(ORGANIZATION_GROUP_KEY, organizationId, properties, this.onError('upsertGroup'));
    });

    if (user?._id) {
      this.addUserToOrganization(user._id, organizationId);
    }
  }

  updateGroup(userId: string, groupId: string, traits: Traits) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    this.safely('updateGroup', () => {
      mixpanel.groups.set(ORGANIZATION_GROUP_KEY, groupId, traits, this.onError('updateGroup'));
    });

    if (userId) {
      this.addUserToOrganization(userId, groupId);
    }
  }

  alias(distinctId: string, userId: string) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    this.safely('alias', () => {
      mixpanel.alias(distinctId, userId, this.onError('alias'));
    });
  }

  upsertUser(user: IUser, distinctId: string, traits: Traits = {}) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    const { tokens } = user as IUser & { tokens?: Array<{ provider?: string; username?: string }> };
    const githubToken = tokens?.find((token) => token.provider === 'github');

    this.safely('upsertUser', () => {
      mixpanel.people.set(
        distinctId,
        {
          $first_name: user.firstName,
          $last_name: user.lastName,
          $name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          $email: user.email,
          $avatar: user.profilePicture,
          $created: this.convertToIsoDate(user.createdAt),
          githubProfile: githubToken?.username,
          ...traits,
        },
        this.onError('upsertUser')
      );
    });
  }

  setValue(userId: string, propertyName: string, value: string | number) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    this.safely('setValue', () => {
      mixpanel.people.set(userId, { [this.toReservedPeopleProperty(propertyName)]: value }, this.onError('setValue'));
    });
  }

  track(name: string, userId: string, data: Record<string, unknown> = {}) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    this.safely(
      'track',
      () => {
        mixpanel.track(
          name,
          {
            ...data,
            distinct_id: userId,
          },
          this.onError('track', { eventName: name, userId })
        );
      },
      { eventName: name, userId }
    );
  }

  /**
   * @deprecated All events are sent to Mixpanel now, use `track` instead.
   */
  mixpanelTrack(name: string, userId: string, data: Record<string, unknown> = {}) {
    this.track(name, userId, data);
  }

  private addUserToOrganization(userId: string, organizationId: string) {
    const mixpanel = this.client;
    if (!mixpanel) {
      return;
    }

    this.safely('addUserToOrganization', () => {
      mixpanel.people.union(
        userId,
        { [ORGANIZATION_GROUP_KEY]: [organizationId] },
        this.onError('addUserToOrganization')
      );
    });
  }

  private get client(): Mixpanel.Mixpanel | undefined {
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }

    return this.mixpanel;
  }

  private toReservedPeopleProperty(propertyName: string): string {
    const reserved: Record<string, string> = {
      email: '$email',
      firstName: '$first_name',
      lastName: '$last_name',
      name: '$name',
      avatar: '$avatar',
      phone: '$phone',
    };

    return reserved[propertyName] ?? propertyName;
  }

  private safely(operation: string, fn: () => void, context: Record<string, unknown> = {}) {
    try {
      fn();
    } catch (error: unknown) {
      this.logError(operation, error instanceof Error ? error : new Error(String(error)), context);
    }
  }

  private onError(operation: string, context: Record<string, unknown> = {}): Mixpanel.Callback {
    return (error) => {
      if (error) {
        this.logError(operation, error, context);
      }
    };
  }

  private logError(operation: string, error: Error | undefined, context: Record<string, unknown>) {
    Logger.error(
      {
        operation,
        ...context,
        message: error?.message,
      },
      'There has been an error when sending analytics to Mixpanel',
      LOG_CONTEXT
    );
  }

  private convertToIsoDate(createdAt: string | number | null | undefined): string {
    const createdAtNumber = Number(createdAt);
    const isEpochValidNumber = !Number.isNaN(createdAtNumber);

    if (isEpochValidNumber) {
      return new Date(createdAtNumber).toISOString();
    }

    return String(createdAt);
  }
}
