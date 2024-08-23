import { JwtPayload } from '@clerk/types';

export type ClerkJwtPayload = JwtPayload & {
  _id: string;
  email: string;
  lastName: string;
  firstName: string;
  profilePicture: string;
  externalId?: string;
  externalOrgId?: string;
};
