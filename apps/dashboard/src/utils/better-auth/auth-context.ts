import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { createContext } from 'react';

export type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
};

export type BetterAuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuthContextType = {
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  memberRole: MemberRoleEnum | null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);
