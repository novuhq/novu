import type { JwtPayload } from '@clerk/shared/types';

export type ClerkJwtPayload = JwtPayload & {
  _id: string;
  email: string;
  lastName: string;
  firstName: string;
  profilePicture: string;
  externalId?: string;
  externalOrgId?: string;
};
