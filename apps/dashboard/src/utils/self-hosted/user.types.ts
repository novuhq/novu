import { DecodedJwt } from '.';

export interface SelfHostedUser {
  update: () => Promise<null>;
  reload: () => Promise<null>;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  emailAddresses: Array<{ emailAddress?: string }>;
  primaryEmailAddress?: { emailAddress?: string };
  createdAt: Date;
  publicMetadata: { newDashboardOptInStatus: string };
  unsafeMetadata: { newDashboardOptInStatus: string };
  organizationMemberships: Array<Record<string, unknown>>;
  passwordEnabled: boolean;
}

export function createUserFromJwt(decodedJwt: DecodedJwt | null): SelfHostedUser | null {
  if (!decodedJwt) {
    return null;
  }

  return {
    update: async () => null,
    reload: async () => null,
    externalId: decodedJwt._id,
    firstName: decodedJwt.firstName,
    lastName: decodedJwt.lastName,
    emailAddresses: [{ emailAddress: decodedJwt.email }],
    primaryEmailAddress: decodedJwt.email ? { emailAddress: decodedJwt.email } : undefined,
    createdAt: new Date(),
    publicMetadata: { newDashboardOptInStatus: 'opted_in' },
    unsafeMetadata: { newDashboardOptInStatus: 'opted_in' },
    organizationMemberships: [{}],
    passwordEnabled: true,
  };
}
